"""URL routing for the orders app (mounted under `/api/orders/`)."""

from django.urls import path

from apps.orders.views import (
    CartItemDetailView,
    CartView,
    CheckoutView,
    OrderDetailView,
    OrderHistoryView,
    OrderStatusUpdateView,
    PaymentInitiationView,
)

app_name = "orders"

urlpatterns = [
    # Cart
    path("cart/", CartView.as_view(), name="cart"),
    # PATCH (به‌روزرسانی تعداد) و DELETE (حذف ردیف)
    path("cart/items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    # Checkout
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    # Order history & detail
    path("history/", OrderHistoryView.as_view(), name="history"),
    path("history/<int:order_id>/", OrderDetailView.as_view(), name="order-detail"),
    # تغییر وضعیت سفارش (فقط ADMIN/OWNER)
    path(
        "history/<int:order_id>/status/",
        OrderStatusUpdateView.as_view(),
        name="order-status-update",
    ),
    # Payment (placeholder gateway)
    path("<int:order_id>/pay/", PaymentInitiationView.as_view(), name="pay"),
]
