"""
Django admin configuration for the product catalog.

Variants and images are edited inline on the product page. Categories, brands
and variants get rich search fields and list filters for day-to-day admin work.
"""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.products.models import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductVariant,
)


# --------------------------------------------------------------------------- #
# Inlines
# --------------------------------------------------------------------------- #
class ProductVariantInline(admin.TabularInline):
    """Manage a product's variants directly on its change page."""

    model = ProductVariant
    extra = 1
    fields = (
        "sku",
        "attributes",
        "price_modifier",
        "stock_quantity",
        "is_active",
    )
    show_change_link = True


class ProductImageInline(admin.TabularInline):
    """Manage a product's images inline."""

    model = ProductImage
    extra = 1
    fields = ("image", "alt_text", "is_primary", "sort_order")


# --------------------------------------------------------------------------- #
# Category
# --------------------------------------------------------------------------- #
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "full_path", "parent", "is_active", "created_at")
    list_filter = ("is_active", "parent")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ("parent",)
    ordering = ("name",)

    @admin.display(description=_("Path"))
    def full_path(self, obj: Category) -> str:
        return obj.full_path


# --------------------------------------------------------------------------- #
# Brand
# --------------------------------------------------------------------------- #
@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("name",)


# --------------------------------------------------------------------------- #
# Product
# --------------------------------------------------------------------------- #
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "brand",
        "base_price",
        "status",
        "total_stock",
        "is_featured",
        "created_at",
    )
    list_filter = ("status", "is_featured", "category", "brand")
    search_fields = ("title", "slug", "description", "brand__name", "category__name")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("category", "brand")
    list_select_related = ("category", "brand")
    inlines = (ProductImageInline, ProductVariantInline)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("title", "slug", "description", "status", "is_featured")}),
        (_("Classification"), {"fields": ("category", "brand")}),
        (_("Pricing"), {"fields": ("base_price",)}),
        (
            _("Dynamic specifications"),
            {
                "fields": ("specifications",),
                "description": _(
                    "Validated against the category's "
                    "dynamic_attributes_schema on save."
                ),
            },
        ),
        (_("Timestamps"), {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description=_("Total stock"))
    def total_stock(self, obj: Product) -> int:
        return obj.total_stock


# --------------------------------------------------------------------------- #
# ProductVariant (standalone, for inventory ops)
# --------------------------------------------------------------------------- #
@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = (
        "sku",
        "product",
        "final_price",
        "stock_quantity",
        "is_active",
        "is_in_stock",
    )
    list_filter = ("is_active", "product__category", "product__brand")
    search_fields = ("sku", "product__title")
    autocomplete_fields = ("product",)
    list_select_related = ("product",)

    @admin.display(description=_("Final price"))
    def final_price(self, obj: ProductVariant):
        return obj.final_price

    @admin.display(boolean=True, description=_("In stock"))
    def is_in_stock(self, obj: ProductVariant) -> bool:
        return obj.is_in_stock
