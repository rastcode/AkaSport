"""
API views for the product catalog.

ViewSets expose list / retrieve / create / update / delete with:
    * faceted filtering + search + ordering (see `filters.py`)
    * pagination (project default PageNumberPagination)
    * RBAC: public read, ADMIN/OWNER write (see `permissions.py`)

Read and write use different serializers so customers get rich nested data
while admins post a flat, writable payload.
"""

from __future__ import annotations

from typing import Type

from django.db.models import Prefetch, QuerySet
from rest_framework import filters as drf_filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from apps.products.filters import ProductFilter
from apps.products.models import Brand, Category, Product, ProductVariant
from apps.products.permissions import ReadOnlyOrIsAdmin
from apps.products.serializers import (
    BrandSerializer,
    CategorySerializer,
    CategoryTreeSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductVariantReadSerializer,
    ProductVariantWriteSerializer,
    ProductWriteSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    """CRUD for categories, plus a `/tree/` action for the full hierarchy."""

    queryset = Category.objects.all().select_related("parent")
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrIsAdmin]
    lookup_field = "slug"
    filter_backends = [drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ("name", "slug")
    ordering_fields = ("name", "created_at")

    @action(detail=False, methods=["get"])
    def tree(self, request: Request) -> Response:
        """Return the active category forest (roots with nested children)."""
        roots = self.get_queryset().filter(parent__isnull=True, is_active=True)
        serializer = CategoryTreeSerializer(
            roots, many=True, context=self.get_serializer_context()
        )
        return Response(serializer.data)


class BrandViewSet(viewsets.ModelViewSet):
    """CRUD for brands."""

    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [ReadOnlyOrIsAdmin]
    lookup_field = "slug"
    filter_backends = [drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ("name", "slug")
    ordering_fields = ("name", "created_at")


class ProductViewSet(viewsets.ModelViewSet):
    """
    Primary catalog endpoint: `/api/products/`.

    Supports faceted filtering (category, brand, price range, JSONB specs and
    variant attributes), full-text-ish search, ordering, and pagination.
    """

    permission_classes = [ReadOnlyOrIsAdmin]
    lookup_field = "slug"
    filterset_class = ProductFilter
    search_fields = ("title", "description", "brand__name", "category__name")
    ordering_fields = ("base_price", "created_at", "title")
    ordering = ("-created_at",)

    def get_queryset(self) -> QuerySet[Product]:
        """Eager-load related rows to avoid N+1 queries on list/detail."""
        qs = (
            Product.objects.select_related("category", "brand")
            .prefetch_related(
                "images",
                Prefetch(
                    "variants",
                    queryset=ProductVariant.objects.filter(is_active=True),
                ),
            )
        )
        # Anonymous / non-admin users only see published products.
        user = self.request.user
        is_staff_role = bool(
            user
            and user.is_authenticated
            and getattr(user, "is_admin", False)
        )
        if not is_staff_role:
            qs = qs.filter(status=Product.Status.PUBLISHED)
        return qs

    def get_serializer_class(self) -> Type[BaseSerializer]:
        if self.action == "list":
            return ProductListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return ProductWriteSerializer
        return ProductDetailSerializer

    @action(detail=True, methods=["get"])
    def variants(self, request: Request, slug: str | None = None) -> Response:
        """List a single product's variants."""
        product = self.get_object()
        serializer = ProductVariantReadSerializer(
            product.variants.all(), many=True, context=self.get_serializer_context()
        )
        return Response(serializer.data)


class ProductVariantViewSet(viewsets.ModelViewSet):
    """Direct CRUD on variants (admin tooling / inventory updates)."""

    queryset = ProductVariant.objects.select_related("product")
    permission_classes = [ReadOnlyOrIsAdmin]
    filter_backends = [drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ("sku", "product__title")
    ordering_fields = ("sku", "stock_quantity", "created_at")

    def get_serializer_class(self) -> Type[BaseSerializer]:
        if self.action in {"create", "update", "partial_update"}:
            return ProductVariantWriteSerializer
        return ProductVariantReadSerializer
