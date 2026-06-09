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
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsAdmin
from apps.orders.models import Cart, CartItem, Order
from apps.orders.serializers import (
    CartItemWriteSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
)


# --------------------------------------------------------------------------- #
# Cart
# --------------------------------------------------------------------------- #
class CartView(APIView):
    """Manage the authenticated user's persistent cart."""

    permission_classes = [permissions.IsAuthenticated]

    def _get_cart(self, request: Request) -> Cart:
        cart, _created = Cart.objects.get_or_create(user=request.user)
        return cart

    def get(self, request: Request) -> Response:
        cart = self._get_cart(request)
        return Response(CartSerializer(cart, context={"request": request}).data)

    def post(self, request: Request) -> Response:
        """Add a new item or update an existing line's quantity."""
        serializer = CartItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart = self._get_cart(request)
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

            # Soft stock guard at cart time (hard check happens at checkout).
            if item.quantity > variant.stock_quantity:
                return Response(
                    {
                        "product_variant": (
                            f"Only {variant.stock_quantity} unit(s) of "
                            f"{variant.sku} are available."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item.save()

        return Response(
            CartSerializer(cart, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request: Request) -> Response:
        """Empty the entire cart."""
        cart = self._get_cart(request)
        cart.clear()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemDeleteView(APIView):
    """Remove a single line from the cart."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request: Request, item_id: int) -> Response:
        cart = get_object_or_404(Cart, user=request.user)
        item = get_object_or_404(CartItem, id=item_id, cart=cart)
        item.delete()
        return Response(
            CartSerializer(cart, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


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
        qs = Order.objects.prefetch_related("items").select_related("coupon")
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
            Order.objects.prefetch_related("items"), id=order_id
        )
        if not getattr(request.user, "is_admin", False) and order.user_id != request.user.id:
            # Hide existence from non-owners.
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You do not have access to this order.")
        return order

    def get(self, request: Request, order_id: int) -> Response:
        order = self._get_order(request, order_id)
        return Response(OrderSerializer(order, context={"request": request}).data)


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

            raise PermissionDenied("You cannot pay for this order.")

        if order.status == Order.Status.PAID:
            return Response(
                {"detail": "This order is already paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status == Order.Status.CANCELED:
            return Response(
                {"detail": "A canceled order cannot be paid."},
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
