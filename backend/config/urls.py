"""Root URL configuration for the AkaSport backend."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/", include("apps.products.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
]
