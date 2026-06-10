"""
Catalog domain models (Persian-first, Digikala-like).

    Category       - multi-level hierarchy, Persian names, per-category schema.
    Brand          - manufacturer / brand.
    Color, Size    - reusable lookup tables for variant facets.
    Product        - Persian title/description, SEO, base + discount price.
    ProductVariant - concrete sellable unit: sku, color, size, price, stock.
    ProductImage   - product/variant images with Persian alt text.

This app supersedes the legacy `apps.products` app. It is intentionally
self-contained (no API wiring yet) so the model architecture can stabilise
before serializers/filters are added in the next phase.

JSON fields (`dynamic_attributes_schema`, `specifications`, variant
`attributes`) map to native JSONB on PostgreSQL for indexed facet queries.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


# --------------------------------------------------------------------------- #
# Category (multi-level)
# --------------------------------------------------------------------------- #
class Category(TimeStampedModel):
    """Self-referential category tree with a per-category attribute schema."""

    name_fa = models.CharField(_("نام (فارسی)"), max_length=150)
    name_en = models.CharField(_("نام (انگلیسی)"), max_length=150, blank=True)
    slug = models.SlugField(_("اسلاگ"), max_length=170, unique=True, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="children",
        null=True,
        blank=True,
        verbose_name=_("دسته‌ی والد"),
    )
    icon = models.ImageField(
        _("آیکن"), upload_to="catalog/categories/icons/", null=True, blank=True
    )
    image = models.ImageField(
        _("تصویر"), upload_to="catalog/categories/images/", null=True, blank=True
    )
    is_active = models.BooleanField(_("فعال"), default=True)
    display_order = models.PositiveIntegerField(_("ترتیب نمایش"), default=0)
    dynamic_attributes_schema = models.JSONField(
        _("شمای ویژگی‌های پویا"),
        default=dict,
        blank=True,
        help_text=_(
            'بلوپرینت ویژگی‌های محصول، مثل '
            '{"weight": {"type": "string", "label": "وزن"}}'
        ),
    )

    class Meta:
        verbose_name = _("دسته‌بندی")
        verbose_name_plural = _("دسته‌بندی‌ها")
        ordering = ("display_order", "name_fa")
        constraints = [
           models.UniqueConstraint(
    fields=["parent", "name_fa"],
    name="uniq_catalog_category_name_per_parent",
)
        ]
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["is_active"])]

    def __str__(self) -> str:
        return self.full_path

    @property
    def full_path(self) -> str:
        """Breadcrumb path, e.g. 'پوشاک ← مردانه ← هودی'."""
        parts = [self.name_fa]
        node = self.parent
        for _depth in range(20):
            if node is None:
                break
            parts.append(node.name_fa)
            node = node.parent
        return " ← ".join(reversed(parts))

    def get_effective_schema(self) -> dict:
        """Merge attribute schemas down the ancestry (leaf overrides root)."""
        chain: list[Category] = []
        node: Optional[Category] = self
        for _depth in range(20):
            if node is None:
                break
            chain.append(node)
            node = node.parent
        merged: dict = {}
        for node in reversed(chain):
            if isinstance(node.dynamic_attributes_schema, dict):
                merged.update(node.dynamic_attributes_schema)
        return merged

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name_en or self.name_fa, allow_unicode=True)
        super().save(*args, **kwargs)


# --------------------------------------------------------------------------- #
# Brand
# --------------------------------------------------------------------------- #
class Brand(TimeStampedModel):
    """Product brand / manufacturer."""

    name_fa = models.CharField(_("نام (فارسی)"), max_length=150, unique=True)
    name_en = models.CharField(_("نام (انگلیسی)"), max_length=150, blank=True)
    slug = models.SlugField(_("اسلاگ"), max_length=170, unique=True, blank=True)
    logo = models.ImageField(
        _("لوگو"), upload_to="catalog/brands/", null=True, blank=True
    )
    description_fa = models.TextField(_("توضیحات"), blank=True)
    is_active = models.BooleanField(_("فعال"), default=True)

    class Meta:
        verbose_name = _("برند")
        verbose_name_plural = _("برندها")
        ordering = ("name_fa",)

    def __str__(self) -> str:
        return self.name_fa

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name_en or self.name_fa, allow_unicode=True)
        super().save(*args, **kwargs)


# --------------------------------------------------------------------------- #
# Lookup tables: Color & Size
# --------------------------------------------------------------------------- #
class Color(models.Model):
    """Reusable colour facet."""

    name_fa = models.CharField(_("نام رنگ"), max_length=60, unique=True)
    hex_code = models.CharField(_("کد رنگ"), max_length=7, blank=True)  # #RRGGBB
    is_active = models.BooleanField(_("فعال"), default=True)

    class Meta:
        verbose_name = _("رنگ")
        verbose_name_plural = _("رنگ‌ها")
        ordering = ("name_fa",)

    def __str__(self) -> str:
        return self.name_fa


class Size(models.Model):
    """Reusable size facet."""

    name_fa = models.CharField(_("نام سایز"), max_length=60)
    value = models.CharField(_("مقدار"), max_length=30, unique=True)
    display_order = models.PositiveIntegerField(_("ترتیب نمایش"), default=0)

    class Meta:
        verbose_name = _("سایز")
        verbose_name_plural = _("سایزها")
        ordering = ("display_order", "value")

    def __str__(self) -> str:
        return self.name_fa


# --------------------------------------------------------------------------- #
# Product
# --------------------------------------------------------------------------- #
class Product(TimeStampedModel):
    """Base product. Concrete sellable units live in `ProductVariant`."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("پیش‌نویس")
        PUBLISHED = "PUBLISHED", _("منتشرشده")
        OUT_OF_STOCK = "OUT_OF_STOCK", _("ناموجود")
        ARCHIVED = "ARCHIVED", _("بایگانی‌شده")

    title_fa = models.CharField(_("عنوان (فارسی)"), max_length=255)
    title_en = models.CharField(_("عنوان (انگلیسی)"), max_length=255, blank=True)
    slug = models.SlugField(_("اسلاگ"), max_length=280, unique=True, blank=True)
    short_description_fa = models.CharField(
        _("توضیح کوتاه"), max_length=500, blank=True
    )
    description_fa = models.TextField(_("توضیحات"), blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
        verbose_name=_("دسته‌بندی"),
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.PROTECT,
        related_name="products",
        null=True,
        blank=True,
        verbose_name=_("برند"),
    )
    base_price = models.DecimalField(
        _("قیمت پایه"),
        max_digits=12,
        decimal_places=0,  # Toman amounts (no minor units)
        validators=[MinValueValidator(Decimal("0"))],
    )
    discount_price = models.DecimalField(
        _("قیمت با تخفیف"),
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0"))],
        help_text=_("در صورت تنظیم، قیمت مؤثر فروش است."),
    )
    status = models.CharField(
        _("وضعیت"),
        max_length=12,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    specifications = models.JSONField(
        _("مشخصات فنی"),
        default=dict,
        blank=True,
        help_text=_('مثل {"جنس": "پنبه", "وزن": "۳۰۰ گرم"}'),
    )
    seo_title = models.CharField(_("عنوان سئو"), max_length=255, blank=True)
    seo_description = models.CharField(_("توضیحات سئو"), max_length=320, blank=True)
    view_count = models.PositiveIntegerField(_("تعداد بازدید"), default=0)
    # Units sold — incremented by the orders domain in a later phase. Exposed
    # now so the catalog API can offer a `best_selling` ordering.
    sold_count = models.PositiveIntegerField(_("تعداد فروش"), default=0, db_index=True)
    is_featured = models.BooleanField(_("منتخب"), default=False)

    class Meta:
        verbose_name = _("محصول")
        verbose_name_plural = _("محصولات")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["category", "brand"]),
            models.Index(fields=["-view_count"]),
        ]

    def __str__(self) -> str:
        return self.title_fa

    @property
    def effective_price(self) -> Decimal:
        """The price actually charged (discount if present, else base)."""
        return self.discount_price if self.discount_price is not None else self.base_price

    @property
    def has_discount(self) -> bool:
        return (
            self.discount_price is not None
            and self.discount_price < self.base_price
        )

    @property
    def discount_percent(self) -> int:
        """Whole-percent discount off the base price (0 if none)."""
        if not self.has_discount or self.base_price == 0:
            return 0
        off = (self.base_price - self.discount_price) / self.base_price * 100
        return int(off)

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.title_en or self.title_fa, allow_unicode=True)
        super().save(*args, **kwargs)


# --------------------------------------------------------------------------- #
# Product variant
# --------------------------------------------------------------------------- #
class ProductVariant(TimeStampedModel):
    """A concrete, sellable variation of a product (color/size/etc.)."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
        verbose_name=_("محصول"),
    )
    sku = models.CharField(_("کد انبار (SKU)"), max_length=64, unique=True)
    color = models.ForeignKey(
        Color,
        on_delete=models.SET_NULL,
        related_name="variants",
        null=True,
        blank=True,
        verbose_name=_("رنگ"),
    )
    size = models.ForeignKey(
        Size,
        on_delete=models.SET_NULL,
        related_name="variants",
        null=True,
        blank=True,
        verbose_name=_("سایز"),
    )
    attributes = models.JSONField(
        _("ویژگی‌ها"),
        default=dict,
        blank=True,
        help_text=_('ویژگی‌های متمایزکننده‌ی اضافی، مثل {"گرماژ": "۲۴۰"}'),
    )
    price = models.DecimalField(
        _("قیمت"),
        max_digits=12,
        decimal_places=0,
        validators=[MinValueValidator(Decimal("0"))],
    )
    discount_price = models.DecimalField(
        _("قیمت با تخفیف"),
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0"))],
    )
    stock_quantity = models.PositiveIntegerField(
        _("موجودی انبار"), default=0, validators=[MinValueValidator(0)]
    )
    is_active = models.BooleanField(_("فعال"), default=True)

    class Meta:
        verbose_name = _("تنوع محصول")
        verbose_name_plural = _("تنوع‌های محصول")
        ordering = ("product", "sku")
        indexes = [models.Index(fields=["sku"]), models.Index(fields=["is_active"])]

    def __str__(self) -> str:
        return f"{self.product.title_fa} [{self.sku}]"

    @property
    def effective_price(self) -> Decimal:
        return self.discount_price if self.discount_price is not None else self.price

    @property
    def is_in_stock(self) -> bool:
        return self.is_active and self.stock_quantity > 0

    def save(self, *args, **kwargs) -> None:
        if self.sku:
            self.sku = self.sku.strip().upper()
        super().save(*args, **kwargs)


# --------------------------------------------------------------------------- #
# Product image
# --------------------------------------------------------------------------- #
class ProductImage(TimeStampedModel):
    """An ordered image for a product (optionally tied to a variant)."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name=_("محصول"),
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="images",
        null=True,
        blank=True,
        verbose_name=_("تنوع"),
    )
    image = models.ImageField(_("تصویر"), upload_to="catalog/products/")
    alt_text_fa = models.CharField(_("متن جایگزین"), max_length=255, blank=True)
    is_primary = models.BooleanField(_("تصویر اصلی"), default=False)
    display_order = models.PositiveIntegerField(_("ترتیب نمایش"), default=0)

    class Meta:
        verbose_name = _("تصویر محصول")
        verbose_name_plural = _("تصاویر محصول")
        ordering = ("display_order", "id")
        indexes = [models.Index(fields=["product", "is_primary"])]

    def __str__(self) -> str:
        return f"تصویر #{self.pk} برای {self.product_id}"
        # catalog uses apps.core.TimeStampedModel (Phase 1 cleanup)
