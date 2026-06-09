"""
Serializers for carts, coupons and the atomic checkout flow.

The `CheckoutSerializer` is the critical path: it runs entirely inside
`transaction.atomic()`, locks the affected inventory rows with
`select_for_update()`, validates stock, prices the order via the Strategy
layer, writes the `Order`/`OrderItem` snapshot, decrements stock, and clears
the cart — all-or-nothing.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import (
    Cart,
    CartItem,
    Coupon,
    Order,
    OrderItem,
)
from apps.orders.strategies import (
    LineSpec,
    get_pricing_strategy,
    resolve_unit_weight_g,
)
from apps.products.models import ProductVariant


# ======================================================================= #
# Cart serializers
# ======================================================================= #
class CartItemSerializer(serializers.ModelSerializer):
    """Read representation of a cart line."""

    sku = serializers.CharField(source="product_variant.sku", read_only=True)
    product_title = serializers.CharField(
        source="product_variant.product.title", read_only=True
    )
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    line_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    available_stock = serializers.IntegerField(
        source="product_variant.stock_quantity", read_only=True
    )

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product_variant",
            "sku",
            "product_title",
            "quantity",
            "unit_price",
            "line_total",
            "available_stock",
        )
        read_only_fields = ("id",)


class CartItemWriteSerializer(serializers.Serializer):
    """
    Payload for adding / updating a cart line.

    `mode` controls quantity semantics:
        * "set"  (default) - quantity becomes exactly the supplied value.
        * "add"            - quantity is incremented by the supplied value.
    """

    product_variant = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all()
    )
    quantity = serializers.IntegerField(min_value=1)
    mode = serializers.ChoiceField(choices=("set", "add"), default="set")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        variant: ProductVariant = attrs["product_variant"]
        if not variant.is_active:
            raise serializers.ValidationError(
                {"product_variant": "This variant is not available for purchase."}
            )
        return attrs


class CartSerializer(serializers.ModelSerializer):
    """Full cart representation with aggregates."""

    items = CartItemSerializer(many=True, read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    is_empty = serializers.BooleanField(read_only=True)

    class Meta:
        model = Cart
        fields = (
            "id",
            "user",
            "items",
            "total_quantity",
            "subtotal",
            "is_empty",
            "updated_at",
        )
        read_only_fields = fields


# ======================================================================= #
# Coupon
# ======================================================================= #
class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = (
            "id",
            "code",
            "discount_type",
            "value",
            "active",
            "valid_from",
            "valid_to",
            "max_uses",
            "used_count",
        )
        read_only_fields = ("id", "used_count")


# ======================================================================= #
# Order representation
# ======================================================================= #
class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_variant",
            "variant_sku",
            "product_title",
            "quantity",
            "price_at_purchase",
            "line_total",
        )
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    coupon_code = serializers.CharField(
        source="coupon.code", read_only=True, default=None
    )
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "user",
            "status",
            "subtotal",
            "discount_amount",
            "shipping_cost",
            "total_amount",
            "coupon",
            "coupon_code",
            "shipping_address",
            "pricing_strategy",
            "item_count",
            "items",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ======================================================================= #
# Checkout
# ======================================================================= #
class CheckoutSerializer(serializers.Serializer):
    """
    Execute a checkout for the requesting user's cart.

    Input:
        shipping_address : structured JSON snapshot (required).
        coupon_code      : optional discount code.
        strategy         : optional explicit pricing strategy override.

    Output (`to_representation`): the created `Order`.
    """

    shipping_address = serializers.JSONField()
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    strategy = serializers.CharField(required=False, allow_blank=True)

    # ---------------------------- validation --------------------------- #
    def validate_shipping_address(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict) or not value:
            raise serializers.ValidationError(
                "shipping_address must be a non-empty JSON object."
            )
        required = {"line1", "city", "country"}
        missing = required - set(value)
        if missing:
            raise serializers.ValidationError(
                f"shipping_address is missing required keys: {sorted(missing)}."
            )
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        user = self.context["request"].user
        cart = (
            Cart.objects.filter(user=user)
            .prefetch_related("items__product_variant__product")
            .first()
        )
        if cart is None or cart.is_empty:
            raise serializers.ValidationError("Your cart is empty.")
        attrs["cart"] = cart

        # Resolve coupon (existence + validity) up front for a clean 400.
        code = (attrs.get("coupon_code") or "").strip().upper()
        coupon = None
        if code:
            coupon = Coupon.objects.filter(code=code).first()
            if coupon is None:
                raise serializers.ValidationError(
                    {"coupon_code": "This coupon code does not exist."}
                )
            reason = coupon.validation_error()
            if reason:
                raise serializers.ValidationError({"coupon_code": reason})
        attrs["coupon"] = coupon
        return attrs

    # ------------------------------ create ----------------------------- #
    def create(self, validated_data: dict[str, Any]) -> Order:
        user = self.context["request"].user
        cart: Cart = validated_data["cart"]
        coupon: Coupon | None = validated_data["coupon"]
        shipping_address: dict[str, Any] = validated_data["shipping_address"]
        strategy_name = (validated_data.get("strategy") or "").strip() or None

        try:
            with transaction.atomic():
                # 1) Lock the variant rows for the cart to serialise concurrent
                #    checkouts and prevent overselling.
                cart_items = list(
                    cart.items.select_related("product_variant__product").all()
                )
                variant_ids = [ci.product_variant_id for ci in cart_items]
                locked = {
                    v.id: v
                    for v in ProductVariant.objects.select_for_update()
                    .select_related("product")
                    .filter(id__in=variant_ids)
                }

                # 2) Validate stock and build normalised pricing lines.
                lines: list[LineSpec] = []
                stock_errors: list[str] = []
                for ci in cart_items:
                    variant = locked.get(ci.product_variant_id)
                    if variant is None or not variant.is_active:
                        stock_errors.append(
                            f"{ci.product_variant.sku}: no longer available."
                        )
                        continue
                    if ci.quantity > variant.stock_quantity:
                        stock_errors.append(
                            f"{variant.sku}: requested {ci.quantity}, "
                            f"only {variant.stock_quantity} in stock."
                        )
                        continue
                    lines.append(
                        LineSpec(
                            sku=variant.sku,
                            title=variant.product.title,
                            quantity=ci.quantity,
                            unit_price=variant.final_price,
                            unit_weight_g=resolve_unit_weight_g(variant),
                            variant_id=variant.id,
                        )
                    )

                if stock_errors:
                    # Raising inside atomic() rolls everything back.
                    raise serializers.ValidationError({"stock": stock_errors})

                # 3) Price the order via the Strategy layer.
                strategy = get_pricing_strategy(name=strategy_name, user=user)
                breakdown = strategy.calculate(lines, coupon=coupon)

                # 4) Persist the Order.
                order = Order.objects.create(
                    user=user,
                    status=Order.Status.PENDING,
                    subtotal=breakdown.subtotal,
                    discount_amount=breakdown.discount_amount,
                    shipping_cost=breakdown.shipping_cost,
                    total_amount=breakdown.total_amount,
                    coupon=coupon,
                    shipping_address=shipping_address,
                    pricing_strategy=breakdown.strategy,
                )

                # 5) Snapshot line items + decrement inventory.
                order_items: list[OrderItem] = []
                for line in lines:
                    variant = locked[line.variant_id]
                    order_items.append(
                        OrderItem(
                            order=order,
                            product_variant=variant,
                            variant_sku=line.sku,
                            product_title=line.title,
                            quantity=line.quantity,
                            price_at_purchase=line.unit_price,
                        )
                    )
                    variant.stock_quantity -= line.quantity
                    variant.save(update_fields=["stock_quantity", "updated_at"])

                OrderItem.objects.bulk_create(order_items)

                # 6) Register coupon usage and clear the cart.
                if coupon is not None:
                    coupon.register_use()
                cart.clear()

        except serializers.ValidationError:
            raise
        except Exception as exc:  # pragma: no cover - defensive guard
            raise serializers.ValidationError(
                {"detail": f"Checkout failed and was rolled back: {exc}"}
            ) from exc

        self._order = order
        return order

    def to_representation(self, instance: Order) -> dict[str, Any]:
        order = getattr(self, "_order", instance)
        return OrderSerializer(order, context=self.context).data
