"""
API views for cart, checkout and order management.

Endpoints (mounted under /api/orders/):
    GET    cart/                 - view the current user's cart
    POST   cart/                 - add / update an item
    DELETE cart/items/<id>/      - remove a single item
    DELETE cart/                 - empty the whole cart
    POST   checkout/             - atomically convert the cart into an order
    GET    history/              - list orders (own for customers, all for staff)
    GET    history/<id>/         - retrieve a single order
    POST   <id>/pay/             - placeholder payment initiation
"""

from __future__ import annotations

from typing import Any

from django.db import transaction
from django.db.models import Prefetch, QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from decimal import Decimal, InvalidOperation

from apps.authentication.permissions import IsAdmin
from apps.orders.models import Cart, CartItem, Coupon, Order
from apps.orders.serializers import (
    AddCartItemSerializer,
    CartSerializer,
    CheckoutSerializer,
    CouponSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
    UpdateCartItemSerializer,
)


def cart_queryset() -> QuerySet[Cart]:
    items = CartItem.objects.select_related(
        "product_variant",
        "product_variant__product",
        "product_variant__color",
        "product_variant__size",
    ).prefetch_related(
        "product_variant__images",
        "product_variant__product__images",
    )
    return Cart.objects.prefetch_related(Prefetch("items", queryset=items))


def order_queryset() -> QuerySet[Order]:
    return Order.objects.select_related("user", "coupon").prefetch_related("items")


# --------------------------------------------------------------------------- #
# Cart
# --------------------------------------------------------------------------- #
class CartView(APIView):
    """Manage the authenticated user's persistent cart."""

    permission_classes = [permissions.IsAuthenticated]

    def _get_cart(self, request: Request, *, with_items: bool = True) -> Cart:
        cart, _created = Cart.objects.get_or_create(user=request.user)
        if with_items:
            return cart_queryset().get(pk=cart.pk)
        return cart

    def get(self, request: Request) -> Response:
        cart = self._get_cart(request)
        return Response(CartSerializer(cart, context={"request": request}).data)

    def post(self, request: Request) -> Response:
        """افزودن یک ردیف یا به‌روزرسانی تعداد ردیف موجود (افزودنی یا جایگزین)."""
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart = self._get_cart(request, with_items=False)
        variant = data["product_variant"]
        quantity = data["quantity"]
        mode = data["mode"]

        with transaction.atomic():
            item, created = CartItem.objects.select_for_update().get_or_create(
                cart=cart,
                product_variant=variant,
                defaults={"quantity": quantity},
            )
            if not created:
                item.quantity = (
                    item.quantity + quantity if mode == "add" else quantity
                )

            # کنترل نرم موجودی هنگام افزودن (کنترل قطعی در تسویه‌حساب انجام می‌شود).
            if item.quantity > variant.stock_quantity:
                return Response(
                    {
                        "product_variant": (
                            f"تنها {variant.stock_quantity} عدد از «{variant.sku}» "
                            "موجود است."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item.save()

        return Response(
            CartSerializer(
                cart_queryset().get(pk=cart.pk), context={"request": request}
            ).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request: Request) -> Response:
        """خالی کردن کامل سبد."""
        cart = self._get_cart(request, with_items=False)
        cart.clear()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemDetailView(APIView):
    """به‌روزرسانی تعداد (PATCH) یا حذف (DELETE) یک ردیف از سبد."""

    permission_classes = [permissions.IsAuthenticated]

    def _get_item(self, request: Request, item_id: int) -> CartItem:
        cart = get_object_or_404(Cart, user=request.user)
        return get_object_or_404(
            CartItem.objects.select_related("product_variant"),
            id=item_id,
            cart=cart,
        )

    def patch(self, request: Request, item_id: int) -> Response:
        item = self._get_item(request, item_id)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]

        if quantity > item.product_variant.stock_quantity:
            return Response(
                {
                    "quantity": (
                        f"تنها {item.product_variant.stock_quantity} عدد از "
                        f"«{item.product_variant.sku}» موجود است."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        return Response(
            CartSerializer(
                cart_queryset().get(pk=item.cart_id), context={"request": request}
            ).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request: Request, item_id: int) -> Response:
        item = self._get_item(request, item_id)
        cart_id = item.cart_id
        item.delete()
        return Response(
            CartSerializer(
                cart_queryset().get(pk=cart_id), context={"request": request}
            ).data,
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------------------------------- #
# Coupons
# --------------------------------------------------------------------------- #
class CouponValidateView(APIView):
    """
    POST coupons/validate/  body: {"code": "...", "subtotal": "..."}

    کد را اعتبارسنجی و مبلغ تخفیف را برمی‌گرداند. اعتبارسنجی نهایی هنگام تسویه‌حساب
    دوباره با subtotalِ واقعیِ سبد انجام می‌شود (ضدِ دستکاری سمت‌کاربر).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request) -> Response:
        code = (request.data.get("code") or "").strip().upper()
        if not code:
            return Response(
                {"detail": "کد تخفیف را وارد کنید."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            subtotal = Decimal(str(request.data.get("subtotal") or "0"))
        except (InvalidOperation, TypeError):
            subtotal = Decimal("0")

        coupon = Coupon.objects.filter(code=code).first()
        if coupon is None:
            return Response(
                {"detail": "کد تخفیف معتبر نیست."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = coupon.validation_error(subtotal=subtotal)
        if reason:
            return Response({"detail": reason}, status=status.HTTP_400_BAD_REQUEST)

        discount = coupon.compute_discount(subtotal)
        return Response(
            {
                "code": coupon.code,
                "discount_type": coupon.discount_type,
                "value": str(coupon.value),
                "discount_amount": str(discount),
                "message": "کد تخفیف اعمال شد.",
            }
        )


class AdminCouponViewSet(viewsets.ModelViewSet):
    """مدیریت کدهای تخفیف (فقط ADMIN/OWNER)."""

    serializer_class = CouponSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = Coupon.objects.all().order_by("-created_at")
        status_param = self.request.query_params.get("status")
        now = timezone.now()
        if status_param == "active":
            qs = qs.filter(active=True)
        elif status_param == "inactive":
            qs = qs.filter(active=False)
        elif status_param == "expired":
            qs = qs.filter(valid_to__isnull=False, valid_to__lt=now)
        return qs


# --------------------------------------------------------------------------- #
# Checkout
# --------------------------------------------------------------------------- #
class CheckoutView(APIView):
    """POST to atomically convert the cart into an order."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = CheckoutSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        order = order_queryset().get(pk=order.pk)
        return Response(
            OrderSerializer(order, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# --------------------------------------------------------------------------- #
# Order history
# --------------------------------------------------------------------------- #
class OrderHistoryView(ListAPIView):
    """
    List orders.

    Customers see only their own orders; ADMIN/OWNER roles see all (per the
    Part 1 RBAC roles). Filterable by `?status=`.
    """

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = order_queryset()
        if not getattr(user, "is_admin", False):
            qs = qs.filter(user=user)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param.upper())
        return qs.order_by("-created_at")


class OrderDetailView(APIView):
    """Retrieve a single order, enforcing ownership for non-staff users."""

    permission_classes = [permissions.IsAuthenticated]

    def _get_order(self, request: Request, order_id: int) -> Order:
        order = get_object_or_404(
            order_queryset(), id=order_id
        )
        if not getattr(request.user, "is_admin", False) and order.user_id != request.user.id:
            # وجود سفارش را از کاربر غیرمالک پنهان می‌کنیم.
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("شما به این سفارش دسترسی ندارید.")
        return order

    def get(self, request: Request, order_id: int) -> Response:
        order = self._get_order(request, order_id)
        return Response(OrderSerializer(order, context={"request": request}).data)


class OrderStatusUpdateView(APIView):
    """
    تغییر وضعیت یک سفارش — فقط برای ADMIN/OWNER.

    PATCH history/<id>/status/  body: {"status": "PROCESSING"}

    قوانین:
        - دسترسی فقط برای مدیر/مالک (IsAdmin)؛ مشتری حتی برای سفارش خودش 403.
        - وضعیت نامعتبر → 400 با پیام فارسی.
        - سفارش ناموجود → 404.
        - پاسخ، سفارش کامل (OrderSerializer) است تا فرانت به‌سادگی refresh کند.
    """

    # IsAdmin شامل احراز هویت + نقش ADMIN/OWNER است (OWNER ابرمجموعه‌ی ADMIN).
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def patch(self, request: Request, order_id: int) -> Response:
        order = get_object_or_404(order_queryset(), id=order_id)

        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        if order.status != new_status:
            order.status = new_status
            update_fields = ["status", "updated_at"]
            # همگام‌سازی ساده‌ی زمان پرداخت هنگام ورود به وضعیت «پرداخت‌شده».
            if new_status == Order.Status.PAID and order.paid_at is None:
                order.paid_at = timezone.now()
                update_fields.append("paid_at")
            order.save(update_fields=update_fields)

        return Response(
            OrderSerializer(order, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------------------------------- #
# Payment (placeholder gateway integration)
# --------------------------------------------------------------------------- #
class PaymentInitiationView(APIView):
    """
    Placeholder for a payment gateway integration.

    Represents the "initiate payment" step: in production this would create a
    payment session with a provider (Stripe/Zarinpal/etc.) and return a
    redirect/confirmation URL. Here it validates order state and mocks a
    successful initiation. Only the order owner (or staff) may pay.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request, order_id: int) -> Response:
        order = get_object_or_404(Order, id=order_id)

        is_staff_role = getattr(request.user, "is_admin", False)
        if not is_staff_role and order.user_id != request.user.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("شما اجازه‌ی پرداخت این سفارش را ندارید.")

        if order.status == Order.Status.PAID:
            return Response(
                {"detail": "این سفارش قبلاً پرداخت شده است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status == Order.Status.CANCELED:
            return Response(
                {"detail": "سفارش لغوشده قابل پرداخت نیست."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- gateway integration point -------------------------------- #
        # gateway = PaymentGateway(provider=settings.PAYMENT_PROVIDER)
        # session = gateway.create_session(order)
        # return Response({"payment_url": session.url, ...})
        mock_reference = f"PAY-{order.id:08d}"
        return Response(
            {
                "detail": "Payment initiated (mock gateway).",
                "order_id": order.id,
                "amount": str(order.total_amount),
                "payment_reference": mock_reference,
                "next_action": "redirect_to_gateway",
                "payment_url": f"https://payments.example.com/checkout/{mock_reference}",
            },
            status=status.HTTP_200_OK,
        )
