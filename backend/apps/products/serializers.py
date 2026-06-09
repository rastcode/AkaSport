"""
DRF serializers for the product catalog.

Two families:
    * Read serializers  - optimized, nested representations for customers.
    * Write serializers  - admin/owner create & update with atomic nested
                           variant handling and schema validation.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.products.models import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductVariant,
)
from apps.products.validators import validate_specifications


# ======================================================================= #
# Shared / read serializers
# ======================================================================= #
class BrandSerializer(serializers.ModelSerializer):
    """Read/write representation of a brand."""

    class Meta:
        model = Brand
        fields = ("id", "name", "slug", "logo", "description", "is_active")
        read_only_fields = ("id", "slug")


class CategorySerializer(serializers.ModelSerializer):
    """Flat category representation with its breadcrumb path."""

    full_path = serializers.CharField(read_only=True)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "parent",
            "full_path",
            "description",
            "is_active",
            "dynamic_attributes_schema",
        )
        read_only_fields = ("id", "slug", "full_path")


class CategoryTreeSerializer(serializers.ModelSerializer):
    """Recursive serializer exposing the category subtree."""

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "dynamic_attributes_schema", "children")

    def get_children(self, obj: Category) -> list[dict[str, Any]]:
        children = obj.children.filter(is_active=True)
        return CategoryTreeSerializer(children, many=True, context=self.context).data


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text", "is_primary", "sort_order")
        read_only_fields = ("id",)


class ProductVariantReadSerializer(serializers.ModelSerializer):
    """Customer-facing variant representation including the computed price."""

    final_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    is_in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "sku",
            "price_modifier",
            "final_price",
            "stock_quantity",
            "is_in_stock",
            "attributes",
            "is_active",
        )
        read_only_fields = fields


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the product list endpoint."""

    brand = serializers.StringRelatedField()
    category = serializers.StringRelatedField()
    primary_image = serializers.SerializerMethodField()
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "title",
            "slug",
            "brand",
            "category",
            "base_price",
            "status",
            "is_featured",
            "in_stock",
            "primary_image",
        )

    def get_primary_image(self, obj: Product) -> str | None:
        image = next(
            (img for img in obj.images.all() if img.is_primary),
            obj.images.all().first() if hasattr(obj, "images") else None,
        )
        if image and image.image:
            request = self.context.get("request")
            url = image.image.url
            return request.build_absolute_uri(url) if request else url
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full nested representation for the product retrieve endpoint."""

    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    variants = ProductVariantReadSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    total_stock = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    effective_schema = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "brand",
            "category",
            "base_price",
            "status",
            "specifications",
            "effective_schema",
            "is_featured",
            "total_stock",
            "in_stock",
            "images",
            "variants",
            "created_at",
            "updated_at",
        )

    def get_effective_schema(self, obj: Product) -> dict[str, Any]:
        return obj.category.get_effective_schema() if obj.category_id else {}


# ======================================================================= #
# Write serializers (admin / owner)
# ======================================================================= #
class ProductVariantWriteSerializer(serializers.ModelSerializer):
    """Variant payload used inside the nested product writer."""

    # `id` is writable here so updates can match existing variants.
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "sku",
            "price_modifier",
            "stock_quantity",
            "attributes",
            "is_active",
        )

    def validate_attributes(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise serializers.ValidationError("Attributes must be a JSON object.")
        return value


class ProductWriteSerializer(serializers.ModelSerializer):
    """
    Create / update a product together with its nested variants.

    All nested writes occur inside a single `transaction.atomic` block so a
    failure on any variant rolls back the entire operation.
    """

    variants = ProductVariantWriteSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "category",
            "brand",
            "base_price",
            "status",
            "specifications",
            "is_featured",
            "variants",
        )
        read_only_fields = ("id", "slug")

    # --------------------------- validation ---------------------------- #
    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Validate specifications against the resolved category schema."""
        category = attrs.get("category") or getattr(self.instance, "category", None)
        # `specifications` may be absent on partial update.
        specifications = attrs.get(
            "specifications",
            getattr(self.instance, "specifications", {}) or {},
        )
        if category is not None:
            schema = category.get_effective_schema()
            try:
                validate_specifications(schema, specifications)
            except DjangoValidationError as exc:
                # Re-raise as a DRF error so it renders as a 400 JSON response.
                raise serializers.ValidationError(
                    {"specifications": exc.messages}
                ) from exc
        return attrs

    @staticmethod
    def _validate_unique_variant_skus(variants: list[dict[str, Any]]) -> None:
        skus = [v["sku"].strip().upper() for v in variants if v.get("sku")]
        duplicates = {s for s in skus if skus.count(s) > 1}
        if duplicates:
            raise serializers.ValidationError(
                {"variants": f"Duplicate SKUs in payload: {sorted(duplicates)}."}
            )

    # ----------------------------- create ------------------------------ #
    def create(self, validated_data: dict[str, Any]) -> Product:
        variants_data: list[dict[str, Any]] = validated_data.pop("variants", [])
        self._validate_unique_variant_skus(variants_data)

        try:
            with transaction.atomic():
                product = Product(**validated_data)
                product.full_clean(exclude=["slug"])
                product.save()

                self._bulk_create_variants(product, variants_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"detail": f"Database integrity error: {exc}"}
            ) from exc
        return product

    # ----------------------------- update ------------------------------ #
    def update(self, instance: Product, validated_data: dict[str, Any]) -> Product:
        variants_data = validated_data.pop("variants", None)
        if variants_data is not None:
            self._validate_unique_variant_skus(variants_data)

        try:
            with transaction.atomic():
                for attr, value in validated_data.items():
                    setattr(instance, attr, value)
                instance.full_clean(exclude=["slug"])
                instance.save()

                if variants_data is not None:
                    self._sync_variants(instance, variants_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"detail": f"Database integrity error: {exc}"}
            ) from exc
        return instance

    # --------------------------- internals ----------------------------- #
    @staticmethod
    def _bulk_create_variants(
        product: Product, variants_data: list[dict[str, Any]]
    ) -> None:
        objs: list[ProductVariant] = []
        for data in variants_data:
            data.pop("id", None)
            variant = ProductVariant(product=product, **data)
            variant.full_clean(exclude=["product"])
            objs.append(variant)
        if objs:
            ProductVariant.objects.bulk_create(objs)

    def _sync_variants(
        self, product: Product, variants_data: list[dict[str, Any]]
    ) -> None:
        """
        Upsert strategy: variants with an `id` are updated, those without are
        created, and existing variants omitted from the payload are deleted.
        """
        existing = {v.id: v for v in product.variants.all()}
        seen_ids: set[int] = set()

        for data in variants_data:
            variant_id = data.pop("id", None)
            if variant_id and variant_id in existing:
                variant = existing[variant_id]
                for attr, value in data.items():
                    setattr(variant, attr, value)
                variant.full_clean(exclude=["product"])
                variant.save()
                seen_ids.add(variant_id)
            else:
                variant = ProductVariant(product=product, **data)
                variant.full_clean(exclude=["product"])
                variant.save()
                seen_ids.add(variant.id)

        # Remove variants that were not part of the incoming payload.
        stale_ids = set(existing) - seen_ids
        if stale_ids:
            product.variants.filter(id__in=stale_ids).delete()

    def to_representation(self, instance: Product) -> dict[str, Any]:
        """Return the rich detail representation after a write."""
        return ProductDetailSerializer(instance, context=self.context).data
