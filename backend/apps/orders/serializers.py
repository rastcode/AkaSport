"""
سریالایزرهای سبد خرید، کوپن و فرایند تسویه‌حساب (orders).

اتصال به دامنه‌ی کاتالوگ جدید است: همه‌ی منطق قیمت/عنوان از
`apps.catalog.ProductVariant` می‌آید (effective_price، product.title_fa، color،
size، sku). `CheckoutSerializer` به‌صورت اتمیک، با قفل ردیف‌های موجودی
(select_for_update)، موجودی را بررسی می‌کند، سفارش و اقلام فریزشده را می‌سازد،
موجودی را کم می‌کند، فروش محصول را افزایش می‌دهد و سبد را خالی می‌کند.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional

from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from apps.catalog.models import ProductVariant
from apps.orders.models import Cart, CartItem, Coupon, Order, OrderItem

# قانون ساده‌ی هزینه‌ی ارسال (تومان).
FREE_SHIPPING_THRESHOLD = Decimal("5000000")
FLAT_SHIPPING_COST = Decimal("150000")


# --------------------------------------------------------------------------- #
# کمک‌تابع‌ها
# --------------------------------------------------------------------------- #
def variant_label(variant: ProductVariant) -> str:
    """برچسب خوانای تنوع از رنگ/سایز، مثل «مشکی - ۴۲»."""
    parts = []
    if variant.color:
        parts.append(variant.color.name_fa)
    if variant.size:
        parts.append(variant.size.name_fa)
    return " - ".join(parts)


def variant_image_url(variant: ProductVariant, request) -> Optional[str]:
    """نخستین تصویرِ تنوع، در غیر این صورت تصویر اصلی محصول، در غیر این صورت None."""
    image = variant.images.first() if hasattr(variant, "images") else None
    if image is None:
        image = variant.product.images.first() if variant.product_id else None
    if image is None or not image.image:
        return None
    url = image.image.url
    return request.build_absolute_uri(url) if request else url


# ======================================================================= #
# سبد خرید
# ======================================================================= #
class CartItemSerializer(serializers.ModelSerializer):
    """نمایش یک ردیف سبد با اطلاعات کافی برای فرانت."""

    product_variant = serializers.IntegerField(source="product_variant_id", read_only=True)
    sku = serializers.CharField(source="product_variant.sku", read_only=True)
    product_title_fa = serializers.CharField(
        source="product_variant.product.title_fa", read_only=True
    )
    product_slug = serializers.CharField(
        source="product_variant.product.slug", read_only=True
    )
    variant_label = serializers.SerializerMethodField()
    color = serializers.CharField(
        source="product_variant.color.name_fa", read_only=True, default=None
    )
    size = serializers.CharField(
        source="product_variant.size.name_fa", read_only=True, default=None
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
    image = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product_variant",
            "sku",
            "product_title_fa",
            "product_slug",
            "variant_label",
            "color",
            "size",
            "unit_price",
            "quantity",
            "line_total",
            "available_stock",
            "image",
        )
        read_only_fields = fields

    def get_variant_label(self, obj: CartItem) -> str:
        return variant_label(obj.product_variant)

    def get_image(self, obj: CartItem) -> Optional[str]:
        return variant_image_url(obj.product_variant, self.context.get("request"))


class AddCartItemSerializer(serializers.Serializer):
    """افزودن/به‌روزرسانی یک ردیف سبد.

    `mode`: "add" مقدار را اضافه می‌کند، "set" مقدار را جایگزین می‌کند.
    """

    product_variant = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all()
    )
    quantity = serializers.IntegerField(min_value=1)
    mode = serializers.ChoiceField(choices=("add", "set"), default="add")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        variant: ProductVariant = attrs["product_variant"]
        if not variant.is_active:
            raise serializers.ValidationError(
                {"product_variant": "این کالا برای خرید در دسترس نیست."}
            )
        return attrs


class UpdateCartItemSerializer(serializers.Serializer):
    """به‌روزرسانی تعداد یک ردیف سبد (PATCH)."""

    quantity = serializers.IntegerField(min_value=1)


class CartSerializer(serializers.ModelSerializer):
    """نمایش کامل سبد همراه با جمع‌ها."""

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
# کوپن
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
            "min_order_amount",
            "max_discount_amount",
            "created_at",
        )
        read_only_fields = ("id", "used_count", "created_at")
        extra_kwargs = {
            "valid_from": {"required": False},
            "valid_to": {"required": False, "allow_null": True},
            "min_order_amount": {"required": False, "allow_null": True},
            "max_discount_amount": {"required": False, "allow_null": True},
        }

    def validate_value(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("مقدار تخفیف باید بزرگ‌تر از صفر باشد.")
        return value

    def validate(self, attrs):
        dtype = attrs.get(
            "discount_type", getattr(self.instance, "discount_type", None)
        )
        value = attrs.get("value", getattr(self.instance, "value", None))
        if dtype == Coupon.DiscountType.PERCENTAGE and value is not None and value > 100:
            raise serializers.ValidationError(
                {"value": "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد."}
            )
        return attrs


# ======================================================================= #
# سفارش
# ======================================================================= #
class OrderItemSerializer(serializers.ModelSerializer):
    """اقلام فریزشده‌ی سفارش با کلیدهای موردنظر فرانت."""

    sku = serializers.CharField(source="variant_sku", read_only=True)
    product_title_fa = serializers.CharField(source="product_title", read_only=True)
    unit_price = serializers.DecimalField(
        source="price_at_purchase", max_digits=12, decimal_places=2, read_only=True
    )
    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_variant",
            "sku",
            "product_title_fa",
            "variant_label",
            "unit_price",
            "quantity",
            "total_price",
        )
        read_only_fields = fields


class OrderStatusUpdateSerializer(serializers.Serializer):
    """به‌روزرسانی وضعیت سفارش توسط مدیر/مالک (فقط فیلد status).

    مقادیر مجاز همان `Order.Status` هستند؛ پیام خطا فارسی است.
    """

    status = serializers.ChoiceField(
        choices=Order.Status.choices,
        error_messages={
            "invalid_choice": "وضعیت انتخابی نامعتبر است.",
            "required": "وضعیت سفارش الزامی است.",
            "blank": "وضعیت سفارش الزامی است.",
        },
    )


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
            "receiver_name",
            "receiver_phone",
            "item_count",
            "items",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ======================================================================= #
# تسویه‌حساب
# ======================================================================= #
class CheckoutSerializer(serializers.Serializer):
    """اجرای تسویه‌حساب اتمیک برای سبد کاربر.

    ورودی:
        receiver_name   : نام گیرنده (الزامی)
        receiver_phone  : شماره گیرنده (الزامی)
        shipping_address: آدرس ساختاریافته (الزامی؛ شامل province/city/line1)
        coupon_code     : کد تخفیف (اختیاری)
    """

    receiver_name = serializers.CharField(max_length=150)
    receiver_phone = serializers.CharField(max_length=16)
    shipping_address = serializers.JSONField()
    coupon_code = serializers.CharField(required=False, allow_blank=True)

    # ---------------------------- اعتبارسنجی --------------------------- #
    def validate_shipping_address(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict) or not value:
            raise serializers.ValidationError("آدرس ارسال باید یک شیء معتبر باشد.")
        required = {"province", "city", "line1"}
        missing = required - set(k for k, v in value.items() if str(v).strip())
        if missing:
            raise serializers.ValidationError(
                "آدرس ارسال ناقص است؛ استان، شهر و آدرس دقیق الزامی‌اند."
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
            raise serializers.ValidationError("سبد خرید شما خالی است.")
        attrs["cart"] = cart

        code = (attrs.get("coupon_code") or "").strip().upper()
        coupon = None
        if code:
            coupon = Coupon.objects.filter(code=code).first()
            if coupon is None:
                raise serializers.ValidationError(
                    {"coupon_code": "کد تخفیف معتبر نیست."}
                )
            # اعتبارسنجی نهاییِ سمت‌سرور بر اساس subtotalِ واقعیِ سبد.
            reason = coupon.validation_error(subtotal=cart.subtotal)
            if reason:
                raise serializers.ValidationError({"coupon_code": reason})
        attrs["coupon"] = coupon
        return attrs

    # ------------------------------ ایجاد ----------------------------- #
    def create(self, validated_data: dict[str, Any]) -> Order:
        user = self.context["request"].user
        cart: Cart = validated_data["cart"]
        coupon: Optional[Coupon] = validated_data["coupon"]
        shipping_address: dict[str, Any] = validated_data["shipping_address"]
        receiver_name: str = validated_data["receiver_name"].strip()
        receiver_phone: str = validated_data["receiver_phone"].strip()

        try:
            with transaction.atomic():
                # ۱) قفل ردیف‌های تنوع برای جلوگیری از فروش بیش از موجودی.
                cart_items = list(
                    cart.items.select_related("product_variant__product").all()
                )
                variant_ids = [ci.product_variant_id for ci in cart_items]
                locked = {
                    v.id: v
                    for v in ProductVariant.objects.select_for_update()
                    .select_related("product", "color", "size")
                    .filter(id__in=variant_ids)
                }

                # ۲) بررسی موجودی و ساخت خطوط قیمت‌گذاری.
                lines: list[dict[str, Any]] = []
                stock_errors: list[str] = []
                for ci in cart_items:
                    variant = locked.get(ci.product_variant_id)
                    if variant is None or not variant.is_active:
                        stock_errors.append(
                            f"«{ci.product_variant.sku}» دیگر موجود نیست."
                        )
                        continue
                    if ci.quantity > variant.stock_quantity:
                        stock_errors.append(
                            f"«{variant.sku}»: درخواست {ci.quantity} عدد، "
                            f"تنها {variant.stock_quantity} عدد موجود است."
                        )
                        continue
                    unit_price = variant.effective_price
                    lines.append(
                        {
                            "variant": variant,
                            "quantity": ci.quantity,
                            "unit_price": unit_price,
                            "total": unit_price * ci.quantity,
                        }
                    )

                if stock_errors:
                    # raise داخل atomic همه‌چیز را rollback می‌کند.
                    raise serializers.ValidationError({"stock": stock_errors})

                # ۳) قیمت‌گذاری ساده و قابل فهم.
                subtotal = sum((ln["total"] for ln in lines), Decimal("0"))
                discount = (
                    coupon.compute_discount(subtotal)
                    if coupon is not None
                    else Decimal("0")
                )
                shipping = (
                    Decimal("0")
                    if subtotal >= FREE_SHIPPING_THRESHOLD
                    else FLAT_SHIPPING_COST
                )
                total = subtotal - discount + shipping

                # ۴) ساخت سفارش.
                order = Order.objects.create(
                    user=user,
                    status=Order.Status.PENDING,
                    subtotal=subtotal,
                    discount_amount=discount,
                    shipping_cost=shipping,
                    total_amount=total,
                    coupon=coupon,
                    shipping_address=shipping_address,
                    receiver_name=receiver_name,
                    receiver_phone=receiver_phone,
                )

                # ۵) ساخت اقلام فریزشده + کاهش موجودی + افزایش فروش محصول.
                order_items: list[OrderItem] = []
                for ln in lines:
                    variant = ln["variant"]
                    order_items.append(
                        OrderItem(
                            order=order,
                            product_variant=variant,
                            variant_sku=variant.sku,
                            product_title=variant.product.title_fa,
                            variant_label=variant_label(variant),
                            quantity=ln["quantity"],
                            price_at_purchase=ln["unit_price"],
                            total_price=ln["total"],
                        )
                    )
                    variant.stock_quantity -= ln["quantity"]
                    variant.save(update_fields=["stock_quantity", "updated_at"])
                    # افزایش شمارنده‌ی فروش محصول.
                    type(variant.product).objects.filter(pk=variant.product_id).update(
                        sold_count=F("sold_count") + ln["quantity"]
                    )

                OrderItem.objects.bulk_create(order_items)

                # ۶) ثبت استفاده‌ی کوپن + خالی کردن سبد.
                if coupon is not None:
                    coupon.register_use()
                cart.clear()

        except serializers.ValidationError:
            raise
        except Exception as exc:  # pragma: no cover - گارد دفاعی
            raise serializers.ValidationError(
                {"detail": f"تسویه‌حساب ناموفق بود و لغو شد: {exc}"}
            ) from exc

        self._order = order
        return order

    def to_representation(self, instance: Order) -> dict[str, Any]:
        order = getattr(self, "_order", instance)
        return OrderSerializer(order, context=self.context).data
