"""URL routing for the orders app (mounted under `/api/orders/`)."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.orders.views import (
    AdminCouponViewSet,
    CartItemDetailView,
    CartView,
    CheckoutView,
    CouponValidateView,
    OrderDetailView,
    OrderHistoryView,
    OrderStatusUpdateView,
    PaymentInitiationView,
)

app_name = "orders"

router = DefaultRouter()
router.register("admin/coupons", AdminCouponViewSet, basename="admin-coupon")

urlpatterns = [
    # Cart
    path("cart/", CartView.as_view(), name="cart"),
    # PATCH (به‌روزرسانی تعداد) و DELETE (حذف ردیف)
    path("cart/items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    # Coupons
    path("coupons/validate/", CouponValidateView.as_view(), name="coupon-validate"),
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
    # CRUD ادمینِ کدهای تخفیف
    path("", include(router.urls)),
]
