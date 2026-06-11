"""
URL routing for the catalog API (mounted under `/api/catalog/`).

Public read endpoints and admin write endpoints are registered on separate
routers; the admin endpoints live under the `admin/` prefix and are gated by
`IsAdminOrOwner`, so they are never exposed as public read URLs.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.catalog.views import (
    AdminBrandViewSet,
    AdminCategoryViewSet,
    AdminColorViewSet,
    AdminProductImageViewSet,
    AdminProductReviewViewSet,
    AdminProductVariantViewSet,
    AdminProductViewSet,
    AdminSizeViewSet,
    BrandViewSet,
    CategoryViewSet,
    ColorViewSet,
    ProductReviewListCreateView,
    ProductViewSet,
    SearchSuggestionsView,
    SizeViewSet,
    WishlistListView,
    WishlistRemoveView,
    WishlistToggleView,
)

app_name = "catalog"

# ----------------------------- public router ------------------------------ #
public_router = DefaultRouter()
public_router.register("categories", CategoryViewSet, basename="category")
public_router.register("brands", BrandViewSet, basename="brand")
public_router.register("colors", ColorViewSet, basename="color")
public_router.register("sizes", SizeViewSet, basename="size")
public_router.register("products", ProductViewSet, basename="product")

# ------------------------------ admin router ------------------------------- #
admin_router = DefaultRouter()
admin_router.register("categories", AdminCategoryViewSet, basename="admin-category")
admin_router.register("brands", AdminBrandViewSet, basename="admin-brand")
admin_router.register("colors", AdminColorViewSet, basename="admin-color")
admin_router.register("sizes", AdminSizeViewSet, basename="admin-size")
admin_router.register("products", AdminProductViewSet, basename="admin-product")
admin_router.register("variants", AdminProductVariantViewSet, basename="admin-variant")
admin_router.register("images", AdminProductImageViewSet, basename="admin-image")
admin_router.register("reviews", AdminProductReviewViewSet, basename="admin-review")

urlpatterns = [
    # نظرات عمومی محصول (فهرست تأییدشده + ثبت)
    path(
        "products/<slug:slug>/reviews/",
        ProductReviewListCreateView.as_view(),
        name="product-reviews",
    ),
    # پیشنهادهای جست‌وجو (autocomplete عمومی)
    path(
        "search/suggestions/",
        SearchSuggestionsView.as_view(),
        name="search-suggestions",
    ),
    # علاقه‌مندی‌ها (کاربر لاگین‌شده)
    path("wishlist/", WishlistListView.as_view(), name="wishlist"),
    path("wishlist/toggle/", WishlistToggleView.as_view(), name="wishlist-toggle"),
    path(
        "wishlist/<slug:slug>/",
        WishlistRemoveView.as_view(),
        name="wishlist-remove",
    ),
    path("", include(public_router.urls)),
    path("admin/", include(admin_router.urls)),
]
