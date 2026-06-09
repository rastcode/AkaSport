"""Persian Django admin for the catalog domain."""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.catalog.models import (
    Brand,
    Category,
    Color,
    Product,
    ProductImage,
    ProductVariant,
    Size,
)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image", "variant", "alt_text_fa", "is_primary", "display_order")


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ("sku", "color", "size", "price", "discount_price", "stock_quantity", "is_active")
    autocomplete_fields = ("color", "size")
    show_change_link = True


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name_fa", "full_path", "parent", "is_active", "display_order")
    list_filter = ("is_active",)
    search_fields = ("name_fa", "name_en", "slug")
    autocomplete_fields = ("parent",)
    prepopulated_fields = {"slug": ("name_en",)}
    ordering = ("display_order", "name_fa")

    @admin.display(description=_("مسیر"))
    def full_path(self, obj: Category) -> str:
        return obj.full_path


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name_fa", "name_en", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name_fa", "name_en", "slug")
    prepopulated_fields = {"slug": ("name_en",)}


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ("name_fa", "hex_code", "is_active")
    search_fields = ("name_fa",)


@admin.register(Size)
class SizeAdmin(admin.ModelAdmin):
    list_display = ("name_fa", "value", "display_order")
    search_fields = ("name_fa", "value")
    ordering = ("display_order", "value")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "title_fa",
        "category",
        "brand",
        "base_price",
        "discount_price",
        "discount_percent",
        "status",
        "view_count",
        "is_featured",
    )
    list_filter = ("status", "is_featured", "category", "brand")
    search_fields = ("title_fa", "title_en", "slug", "description_fa")
    autocomplete_fields = ("category", "brand")
    prepopulated_fields = {"slug": ("title_en",)}
    list_select_related = ("category", "brand")
    readonly_fields = ("view_count", "created_at", "updated_at")
    inlines = (ProductImageInline, ProductVariantInline)
    fieldsets = (
        (None, {"fields": ("title_fa", "title_en", "slug", "status", "is_featured")}),
        (_("توضیحات"), {"fields": ("short_description_fa", "description_fa")}),
        (_("دسته‌بندی و برند"), {"fields": ("category", "brand")}),
        (_("قیمت"), {"fields": ("base_price", "discount_price")}),
        (_("مشخصات فنی"), {"fields": ("specifications",)}),
        (_("سئو"), {"fields": ("seo_title", "seo_description")}),
        (_("آمار و زمان"), {"fields": ("view_count", "created_at", "updated_at")}),
    )

    @admin.display(description=_("٪ تخفیف"))
    def discount_percent(self, obj: Product) -> str:
        return f"{obj.discount_percent}٪" if obj.has_discount else "—"


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = (
        "sku",
        "product",
        "color",
        "size",
        "price",
        "stock_quantity",
        "is_active",
        "is_in_stock",
    )
    list_filter = ("is_active", "color", "size", "product__category")
    search_fields = ("sku", "product__title_fa")
    autocomplete_fields = ("product", "color", "size")
    list_select_related = ("product", "color", "size")

    @admin.display(boolean=True, description=_("موجود"))
    def is_in_stock(self, obj: ProductVariant) -> bool:
        return obj.is_in_stock
