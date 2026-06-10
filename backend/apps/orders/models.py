"""
Domain models for carts, coupons and orders.

    Cart       - one persistent cart per user.
    CartItem   - a ProductVariant + quantity inside a cart.
    Coupon     - discount codes (percentage / fixed) with validity + usage caps.
    Order      - the immutable invoice produced at checkout.
    OrderItem  - frozen line items capturing price_at_purchase.

The split between Cart* (mutable, pre-purchase) and Order* (immutable snapshot)
is deliberate: orders must remain historically accurate even if a product's
price, name or stock later changes.
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

# مهاجرت به دامنه‌ی کاتالوگ جدید: سبد و سفارش به catalog.ProductVariant وصل‌اند
# (دیگر از apps.products قدیمی استفاده نمی‌شود).
from apps.catalog.models import ProductVariant

if TYPE_CHECKING:
    from django.db.models import QuerySet

TWO_PLACES = Decimal("0.01")


class TimeStampedModel(models.Model):
    """Reusable created/updated timestamp mixin."""

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        abstract = True


# --------------------------------------------------------------------------- #
# Cart
# --------------------------------------------------------------------------- #
class Cart(TimeStampedModel):
    """A persistent shopping cart, one per user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
        verbose_name=_("user"),
    )

    class Meta:
        verbose_name = _("cart")
        verbose_name_plural = _("carts")

    def __str__(self) -> str:
        return f"Cart<{self.user}>"

    # -- aggregates ----------------------------------------------------- #
    @property
    def items_queryset(self) -> "QuerySet[CartItem]":
        return self.items.select_related(
            "product_variant",
            "product_variant__product",
            "product_variant__color",
            "product_variant__size",
        )

    @property
    def total_quantity(self) -> int:
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self) -> Decimal:
        """Sum of line totals at current prices (pre-discount, pre-shipping)."""
        total = sum(
            (item.line_total for item in self.items_queryset), Decimal("0.00")
        )
        return Decimal(total).quantize(TWO_PLACES)

    @property
    def is_empty(self) -> bool:
        return not self.items.exists()

    def clear(self) -> None:
        """Remove all items (used after a successful checkout)."""
        self.items.all().delete()


class CartItem(TimeStampedModel):
    """A single variant + quantity line within a cart."""

    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("cart"),
    )
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name=_("product variant"),
    )
    quantity = models.PositiveIntegerField(
        _("quantity"),
        default=1,
        validators=[MinValueValidator(1)],
    )

    class Meta:
        verbose_name = _("cart item")
        verbose_name_plural = _("cart items")
        ordering = ("id",)
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product_variant"],
                name="uniq_cartitem_per_variant",
            )
        ]

    def __str__(self) -> str:
        return f"{self.quantity} x {self.product_variant.sku}"

    @property
    def unit_price(self) -> Decimal:
        """قیمت مؤثر فعلی تنوع (قیمت با تخفیف اگر باشد، در غیر این صورت قیمت پایه)."""
        return self.product_variant.effective_price

    @property
    def line_total(self) -> Decimal:
        return (self.unit_price * self.quantity).quantize(TWO_PLACES)

    @property
    def variant_label(self) -> str:
        """برچسب خوانای تنوع از روی رنگ/سایز، مثل «مشکی - ۴۲»."""
        parts = []
        if self.product_variant.color:
            parts.append(self.product_variant.color.name_fa)
        if self.product_variant.size:
            parts.append(self.product_variant.size.name_fa)
        return " - ".join(parts)


# --------------------------------------------------------------------------- #
# Coupon
# --------------------------------------------------------------------------- #
class Coupon(TimeStampedModel):
    """A discount code applicable at checkout."""

    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", _("Percentage")
        FIXED = "FIXED", _("Fixed amount")

    code = models.CharField(_("code"), max_length=40, unique=True)
    discount_type = models.CharField(
        _("discount type"),
        max_length=10,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
    )
    value = models.DecimalField(
        _("value"),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text=_("Percentage (0-100) or a fixed currency amount."),
    )
    active = models.BooleanField(_("active"), default=True)
    valid_from = models.DateTimeField(_("valid from"), default=timezone.now)
    valid_to = models.DateTimeField(_("valid to"))
    max_uses = models.PositiveIntegerField(
        _("max uses"),
        default=0,
        help_text=_("Maximum total redemptions. 0 means unlimited."),
    )
    used_count = models.PositiveIntegerField(_("used count"), default=0)

    class Meta:
        verbose_name = _("coupon")
        verbose_name_plural = _("coupons")
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.code

    def save(self, *args, **kwargs) -> None:
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def clean(self) -> None:
        super().clean()
        from django.core.exceptions import ValidationError

        if self.valid_to and self.valid_from and self.valid_to <= self.valid_from:
            raise ValidationError(
                {"valid_to": _("تاریخ پایان باید بعد از تاریخ شروع باشد.")}
            )
        if (
            self.discount_type == self.DiscountType.PERCENTAGE
            and self.value > Decimal("100")
        ):
            raise ValidationError(
                {"value": _("درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.")}
            )

    # -- validity helpers ----------------------------------------------- #
    @property
    def has_uses_left(self) -> bool:
        return self.max_uses == 0 or self.used_count < self.max_uses

    def is_valid(self, *, at: timezone.datetime | None = None) -> bool:
        """True if the coupon is active, in its window and not exhausted."""
        now = at or timezone.now()
        return (
            self.active
            and self.valid_from <= now <= self.valid_to
            and self.has_uses_left
        )

    def validation_error(self, *, at: timezone.datetime | None = None) -> str | None:
        """Return a human-readable reason the coupon is invalid, else None."""
        now = at or timezone.now()
        if not self.active:
            return "این کد تخفیف فعال نیست."
        if now < self.valid_from:
            return "این کد تخفیف هنوز معتبر نشده است."
        if now > self.valid_to:
            return "این کد تخفیف منقضی شده است."
        if not self.has_uses_left:
            return "ظرفیت استفاده از این کد تخفیف به پایان رسیده است."
        return None

    def register_use(self) -> None:
        """Atomically increment the redemption counter."""
        type(self).objects.filter(pk=self.pk).update(
            used_count=models.F("used_count") + 1
        )


# --------------------------------------------------------------------------- #
# Order
# --------------------------------------------------------------------------- #
class Order(TimeStampedModel):
    """The immutable invoice generated by checkout."""

    class Status(models.TextChoices):
        PENDING = "PENDING", _("در انتظار پرداخت")
        PAID = "PAID", _("پرداخت‌شده")
        PROCESSING = "PROCESSING", _("در حال پردازش")
        SHIPPED = "SHIPPED", _("ارسال‌شده")
        DELIVERED = "DELIVERED", _("تحویل‌شده")
        CANCELED = "CANCELED", _("لغو‌شده")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
        verbose_name=_("user"),
    )
    status = models.CharField(
        _("status"),
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    # Monetary breakdown, all frozen at checkout time.
    subtotal = models.DecimalField(
        _("subtotal"), max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    discount_amount = models.DecimalField(
        _("discount amount"), max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    shipping_cost = models.DecimalField(
        _("shipping cost"), max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    total_amount = models.DecimalField(
        _("total amount"), max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        related_name="orders",
        null=True,
        blank=True,
        verbose_name=_("coupon"),
    )
    shipping_address = models.JSONField(
        _("shipping address"),
        default=dict,
        help_text=_(
            "Structured address snapshot, e.g. "
            '{"province": "...", "city": "...", "line1": "...", '
            '"postal_code": "...", "notes": "..."}'
        ),
    )
    # گیرنده‌ی سفارش — جدا از آدرس JSON برای دسترسی ساده‌ی فرانت/ادمین.
    receiver_name = models.CharField(_("نام گیرنده"), max_length=150, blank=True)
    receiver_phone = models.CharField(_("شماره گیرنده"), max_length=16, blank=True)
    pricing_strategy = models.CharField(
        _("pricing strategy"),
        max_length=40,
        default="standard",
        help_text=_("Identifier of the strategy used to price this order."),
    )
    paid_at = models.DateTimeField(_("paid at"), null=True, blank=True)

    class Meta:
        verbose_name = _("order")
        verbose_name_plural = _("orders")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"Order #{self.pk} ({self.status})"

    @property
    def item_count(self) -> int:
        return sum(item.quantity for item in self.items.all())

    def mark_paid(self) -> None:
        """Transition the order to PAID (idempotent)."""
        if self.status == self.Status.PAID:
            return
        self.status = self.Status.PAID
        self.paid_at = timezone.now()
        self.save(update_fields=["status", "paid_at", "updated_at"])


class OrderItem(models.Model):
    """
    A frozen line item.

    `price_at_purchase` captures the variant's effective price at checkout so
    the invoice remains accurate regardless of later price changes. The FK to
    the variant is SET_NULL on delete so historical orders survive catalog
    pruning, while denormalised SKU/title preserve readability.
    """

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("order"),
    )
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        related_name="order_items",
        null=True,
        verbose_name=_("product variant"),
    )
    # Denormalised snapshots for historical integrity (frozen at checkout).
    # نام ستون‌ها برای سازگاری با apps.analytics حفظ شده؛ سریالایزر آن‌ها را با
    # کلیدهای موردنظر فرانت (sku / product_title_fa / unit_price) ارائه می‌کند.
    variant_sku = models.CharField(_("variant SKU"), max_length=64)
    product_title = models.CharField(_("product title (fa)"), max_length=255)
    variant_label = models.CharField(_("variant label"), max_length=120, blank=True)
    quantity = models.PositiveIntegerField(
        _("quantity"), validators=[MinValueValidator(1)]
    )
    price_at_purchase = models.DecimalField(
        _("unit price"), max_digits=12, decimal_places=2
    )
    total_price = models.DecimalField(
        _("total price"), max_digits=12, decimal_places=2, default=Decimal("0.00")
    )

    class Meta:
        verbose_name = _("order item")
        verbose_name_plural = _("order items")
        ordering = ("id",)

    def __str__(self) -> str:
        return f"{self.quantity} x {self.variant_sku} @ {self.price_at_purchase}"

    @property
    def line_total(self) -> Decimal:
        """جمع فریزشده‌ی ردیف؛ اگر total_price ثبت نشده باشد، محاسبه می‌شود."""
        if self.total_price and self.total_price > 0:
            return self.total_price
        return (self.price_at_purchase * self.quantity).quantize(TWO_PLACES)
