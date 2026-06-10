"""
Django admin for orders and coupons.

Orders use an inline for their line items so staff can review the historical
purchase and update tracking status. Order financials are read-only to keep
the invoice snapshot trustworthy.
"""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.orders.models import (
    Cart,
    CartItem,
    Coupon,
    Order,
    OrderItem,
)


# --------------------------------------------------------------------------- #
# Inlines
# --------------------------------------------------------------------------- #
class OrderItemInline(admin.TabularInline):
    """Frozen line items shown inline on the order page."""

    model = OrderItem
    extra = 0
    fields = (
        "product_variant",
        "variant_sku",
        "product_title",
        "variant_label",
        "quantity",
        "price_at_purchase",
        "total_price",
    )
    # داده‌ی فریزشده‌ی فاکتور تا حد امکان فقط‌خواندنی است.
    readonly_fields = (
        "variant_sku",
        "product_title",
        "variant_label",
        "price_at_purchase",
        "total_price",
    )
    autocomplete_fields = ("product_variant",)


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    autocomplete_fields = ("product_variant",)


# --------------------------------------------------------------------------- #
# Order
# --------------------------------------------------------------------------- #
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "status",
        "total_amount",
        "discount_amount",
        "shipping_cost",
        "coupon",
        "pricing_strategy",
        "created_at",
    )
    list_display_links = ("id", "user")
    list_filter = ("status", "pricing_strategy", "created_at")
    list_editable = ("status",)  # quick tracking-status updates from the list
    search_fields = ("id", "user__email", "user__phone_number", "items__variant_sku")
    date_hierarchy = "created_at"
    inlines = (OrderItemInline,)
    autocomplete_fields = ("user", "coupon")
    readonly_fields = (
        "subtotal",
        "discount_amount",
        "shipping_cost",
        "total_amount",
        "pricing_strategy",
        "paid_at",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (None, {"fields": ("user", "status", "coupon")}),
        (
            _("Amounts (frozen at checkout)"),
            {
                "fields": (
                    "subtotal",
                    "discount_amount",
                    "shipping_cost",
                    "total_amount",
                    "pricing_strategy",
                )
            },
        ),
        (
            _("Shipping"),
            {"fields": ("receiver_name", "receiver_phone", "shipping_address")},
        ),
        (_("Timestamps"), {"fields": ("paid_at", "created_at", "updated_at")}),
    )


# --------------------------------------------------------------------------- #
# Coupon
# --------------------------------------------------------------------------- #
@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "discount_type",
        "value",
        "active",
        "valid_from",
        "valid_to",
        "used_count",
        "max_uses",
    )
    list_filter = ("discount_type", "active")
    search_fields = ("code",)
    readonly_fields = ("used_count",)
    ordering = ("-created_at",)


# --------------------------------------------------------------------------- #
# Cart (mostly for support/debugging)
# --------------------------------------------------------------------------- #
@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "total_quantity", "subtotal", "updated_at")
    search_fields = ("user__email", "user__phone_number")
    autocomplete_fields = ("user",)
    inlines = (CartItemInline,)

    @admin.display(description=_("Items"))
    def total_quantity(self, obj: Cart) -> int:
        return obj.total_quantity

    @admin.display(description=_("Subtotal"))
    def subtotal(self, obj: Cart):
        return obj.subtotal
