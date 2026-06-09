"""URL routing for the products app (mounted under `/api/`)."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.products.views import (
    BrandViewSet,
    CategoryViewSet,
    ProductVariantViewSet,
    ProductViewSet,
)

app_name = "products"

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("categories", CategoryViewSet, basename="category")
router.register("brands", BrandViewSet, basename="brand")
router.register("variants", ProductVariantViewSet, basename="variant")

urlpatterns = [
    path("", include(router.urls)),
]
