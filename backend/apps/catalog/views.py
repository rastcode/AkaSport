"""
Catalog API views.

Public read viewsets expose only published products / active lookups, are
N+1-safe (select_related + prefetch_related), paginated, and annotate the
fields the filter/ordering layer needs. Admin viewsets provide full CRUD gated
by `IsAdminOrOwner`.
"""

from __future__ import annotations

from typing import Type

from django.db.models import (
    Case,
    Exists,
    F,
    FloatField,
    OuterRef,
    Prefetch,
    QuerySet,
    Value,
    When,
)
from django.db.models.functions import Cast, Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from apps.authentication.permissions import IsAdmin
from apps.catalog.filters import ProductFilter
from apps.catalog.models import (
    Brand,
    Category,
    Color,
    Product,
    ProductImage,
    ProductVariant,
    Size,
)
from apps.catalog.serializers import (
    AdminProductVariantWriteSerializer,
    AdminProductWriteSerializer,
    BrandSerializer,
    CategoryListSerializer,
    CategoryTreeSerializer,
    ColorSerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
    ProductListSerializer,
    ProductVariantSerializer,
    SizeSerializer,
)


# --------------------------------------------------------------------------- #
# Permissions
# --------------------------------------------------------------------------- #
class IsAdminOrOwner(IsAdmin):
    """Write access for ADMIN or OWNER roles only (CUSTOMER/anon denied)."""

    message = "فقط مدیر یا مالک می‌تواند کاتالوگ را ویرایش کند."


# --------------------------------------------------------------------------- #
# Annotated product queryset (shared by public list/detail)
# --------------------------------------------------------------------------- #
def annotated_products() -> QuerySet[Product]:
    """Product queryset annotated for price range, discount sort and stock."""
    effective = Coalesce("discount_price", "base_price")
    base_f = Cast("base_price", FloatField())
    eff_f = Cast(effective, FloatField())

    has_stock = ProductVariant.objects.filter(
        product=OuterRef("pk"), is_active=True, stock_quantity__gt=0
    )

    return (
        Product.objects.select_related("category", "brand")
        .prefetch_related(
            Prefetch(
                "variants",
                queryset=ProductVariant.objects.filter(is_active=True)
                .select_related("color", "size")
                .prefetch_related("images"),
            ),
            "images",
        )
        .annotate(
            eff_price=effective,
            in_stock=Exists(has_stock),
            disc_ratio=Case(
                When(base_price=0, then=Value(0.0)),
                default=(base_f - eff_f) / base_f * Value(100.0),
                output_field=FloatField(),
            ),
        )
    )


# --------------------------------------------------------------------------- #
# Public lookups
# --------------------------------------------------------------------------- #
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """`/categories/` (+ `/categories/tree/`) — active categories."""

    serializer_class = CategoryListSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Category]:
        return Category.objects.filter(is_active=True).order_by(
            "display_order", "name_fa"
        )

    @action(detail=False, methods=["get"])
    def tree(self, request: Request) -> Response:
        roots = (
            Category.objects.filter(parent__isnull=True, is_active=True)
            .order_by("display_order", "name_fa")
            .prefetch_related("children")
        )
        data = CategoryTreeSerializer(
            roots, many=True, context=self.get_serializer_context()
        ).data
        return Response(data)


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Brand]:
        return Brand.objects.filter(is_active=True).order_by("name_fa")


class ColorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ColorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self) -> QuerySet[Color]:
        return Color.objects.filter(is_active=True).order_by("name_fa")


class SizeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SizeSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self) -> QuerySet[Size]:
        return Size.objects.all().order_by("display_order", "value")


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    `/products/` list + `/products/{slug}/` detail.

    Public users see only PUBLISHED products. Faceted filtering, search and the
    six orderings are applied via `ProductFilter` + DRF `SearchFilter`.
    """

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter]
    search_fields = (
        "title_fa",
        "title_en",
        "brand__name_fa",
        "brand__name_en",
        "category__name_fa",
        "category__name_en",
    )

    def get_queryset(self) -> QuerySet[Product]:
        qs = annotated_products()
        if not self._is_staff():
            qs = qs.filter(status=Product.Status.PUBLISHED)
        return qs.order_by("-created_at")

    def get_serializer_class(self) -> Type[BaseSerializer]:
        if self.action == "list":
            return ProductListSerializer
        return ProductDetailSerializer

    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        # Safe, race-free view counter (DB-level F() increment).
        Product.objects.filter(pk=instance.pk).update(
            view_count=F("view_count") + 1
        )
        instance.view_count += 1  # reflect in the response without a re-query
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def _is_staff(self) -> bool:
        user = self.request.user
        return bool(
            user and user.is_authenticated and getattr(user, "is_admin", False)
        )


# --------------------------------------------------------------------------- #
# Admin CRUD viewsets (ADMIN / OWNER only)
# --------------------------------------------------------------------------- #
class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("display_order", "name_fa")
    serializer_class = CategoryListSerializer
    permission_classes = [IsAdminOrOwner]
    lookup_field = "slug"


class AdminBrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by("name_fa")
    serializer_class = BrandSerializer
    permission_classes = [IsAdminOrOwner]
    lookup_field = "slug"


class AdminColorViewSet(viewsets.ModelViewSet):
    queryset = Color.objects.all().order_by("name_fa")
    serializer_class = ColorSerializer
    permission_classes = [IsAdminOrOwner]


class AdminSizeViewSet(viewsets.ModelViewSet):
    queryset = Size.objects.all().order_by("display_order", "value")
    serializer_class = SizeSerializer
    permission_classes = [IsAdminOrOwner]


class AdminProductViewSet(viewsets.ModelViewSet):
    """Full product CRUD with atomic nested-variant management."""

    permission_classes = [IsAdminOrOwner]
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Product]:
        return (
            Product.objects.select_related("category", "brand")
            .prefetch_related("variants__color", "variants__size", "images")
            .order_by("-created_at")
        )

    def get_serializer_class(self) -> Type[BaseSerializer]:
        if self.action in {"list", "retrieve"}:
            return ProductDetailSerializer
        return AdminProductWriteSerializer


class AdminProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related(
        "product", "color", "size"
    ).all()
    permission_classes = [IsAdminOrOwner]

    def get_serializer_class(self) -> Type[BaseSerializer]:
        if self.action in {"list", "retrieve"}:
            return ProductVariantSerializer
        return AdminProductVariantWriteSerializer


class AdminProductImageViewSet(viewsets.ModelViewSet):
    """
    CRUD تصاویر محصول (فقط ADMIN/OWNER) با مدیریت «تصویر اصلی» تک‌تصویری:

      * نخستین تصویرِ هر محصول خودکار اصلی می‌شود.
      * اگر تصویری با is_primary=true ثبت/ویرایش شود، بقیه‌ی تصاویر همان محصول
        غیر‌اصلی می‌شوند.
      * با حذف تصویرِ اصلی، در صورت وجود تصویر دیگر، یکی (کمترین display_order،
        سپس قدیمی‌ترین) خودکار اصلی می‌شود.
    """

    queryset = ProductImage.objects.select_related("product", "variant").all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminOrOwner]

    def perform_create(self, serializer: BaseSerializer) -> None:
        image = serializer.save()
        product_id = image.product_id
        # نخستین تصویر محصول → خودکار اصلی.
        is_first = (
            not ProductImage.objects.filter(product_id=product_id)
            .exclude(pk=image.pk)
            .exists()
        )
        if is_first and not image.is_primary:
            image.is_primary = True
            image.save(update_fields=["is_primary"])
        self._enforce_single_primary(image)

    def perform_update(self, serializer: BaseSerializer) -> None:
        image = serializer.save()
        self._enforce_single_primary(image)

    def perform_destroy(self, instance: ProductImage) -> None:
        product_id = instance.product_id
        was_primary = instance.is_primary
        instance.delete()
        if was_primary:
            replacement = (
                ProductImage.objects.filter(product_id=product_id)
                .order_by("display_order", "id")
                .first()
            )
            if replacement is not None and not replacement.is_primary:
                replacement.is_primary = True
                replacement.save(update_fields=["is_primary"])

    @staticmethod
    def _enforce_single_primary(image: ProductImage) -> None:
        if image.is_primary:
            ProductImage.objects.filter(
                product_id=image.product_id, is_primary=True
            ).exclude(pk=image.pk).update(is_primary=False)
