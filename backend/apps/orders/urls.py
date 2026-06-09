"""URL routing for the orders app (mounted under `/api/orders/`)."""

from django.urls import path

from apps.orders.views import (
    CartItemDeleteView,
    CartView,
    CheckoutView,
    OrderDetailView,
    OrderHistoryView,
    PaymentInitiationView,
)

app_name = "orders"

urlpatterns = [
    # Cart
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/items/<int:item_id>/", CartItemDeleteView.as_view(), name="cart-item-delete"),
    # Checkout
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    # Order history & detail
    path("history/", OrderHistoryView.as_view(), name="history"),
    path("history/<int:order_id>/", OrderDetailView.as_view(), name="order-detail"),
    # Payment (placeholder gateway)
    path("<int:order_id>/pay/", PaymentInitiationView.as_view(), name="pay"),
]
