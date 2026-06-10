"""Root URL configuration for the AkaSport backend."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/catalog/", include("apps.catalog.urls")),
    path("api/", include("apps.products.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
]

# سرو فایل‌های رسانه (تصاویر محصول) فقط در حالت توسعه.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
