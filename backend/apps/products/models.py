"""
Domain models for the product catalog.

Schema:
    Category   - hierarchical (self-FK) tree + dynamic_attributes_schema (JSONB)
    Brand      - name / slug / logo / description
    Product    - base product + specifications (JSONB, validated vs category)
    ProductImage - ordered images for a product
    ProductVariant - concrete sellable unit (sku, price, stock, attributes JSONB)

JSONField maps to native JSONB on PostgreSQL, enabling indexed key lookups for
the faceted filters in `filters.py`.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import JSONField
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from apps.products.validators import (
    validate_schema_definition,
    validate_specifications,
)


# --------------------------------------------------------------------------- #
# Abstract timestamp base
# --------------------------------------------------------------------------- #
class TimeStampedModel(models.Model):
    """Reusable created/updated timestamp mixin."""

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        abstract = True


# --------------------------------------------------------------------------- #
# Category (hierarchical)
# --------------------------------------------------------------------------- #
class Category(TimeStampedModel):
    """
    Self-referential category enabling a multi-level tree.

    `dynamic_attributes_schema` defines the validation blueprint for the
    `specifications` of products in this category.
    """

    name = models.CharField(_("name"), max_length=120)
    slug = models.SlugField(_("slug"), max_length=140, unique=True, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="children",
        null=True,
        blank=True,
        verbose_name=_("parent category"),
    )
    description = models.TextField(_("description"), blank=True)
    is_active = models.BooleanField(_("active"), default=True)
    dynamic_attributes_schema = JSONField(
        _("dynamic attributes schema"),
        default=dict,
        blank=True,
        help_text=_(
            "Blueprint describing allowed product specifications, e.g. "
            '{"weight": {"type": "string", "label": "Weight", "required": true}}'
        ),
    )

    class Meta:
        verbose_name = _("category")
        verbose_name_plural = _("categories")
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(
                fields=["parent", "name"], name="uniq_category_name_per_parent"
            )
        ]
        indexes = [models.Index(fields=["slug"])]

    def __str__(self) -> str:
        return self.full_path

    @property
    def full_path(self) -> str:
        """Breadcrumb path, e.g. 'Clothing -> Men's -> Hoodies'."""
        parts = [self.name]
        node = self.parent
        # Guard against accidental deep loops with a sane cap.
        for _depth in range(20):
            if node is None:
                break
            parts.append(node.name)
            node = node.parent
        return " -> ".join(reversed(parts))

    def get_effective_schema(self) -> dict:
        """
        Merge schemas down the ancestry chain.

        A child category inherits its ancestors' attribute definitions; its own
        keys take precedence. This lets 'Hoodies' add attributes on top of
        'Clothing' without redefining them.
        """
        chain: list[Category] = []
        node: Optional[Category] = self
        for _depth in range(20):
            if node is None:
                break
            chain.append(node)
            node = node.parent

        merged: dict = {}
        for node in reversed(chain):  # root first, leaf last (leaf wins)
            if isinstance(node.dynamic_attributes_schema, dict):
                merged.update(node.dynamic_attributes_schema)
        return merged

    def clean(self) -> None:
        super().clean()
        validate_schema_definition(self.dynamic_attributes_schema)
        # Prevent a category from being its own ancestor (cycle protection).
        node = self.parent
        for _depth in range(20):
            if node is None:
                break
            if node.pk == self.pk and self.pk is not None:
                from django.core.exceptions import ValidationError

                raise ValidationError(
                    {"parent": _("A category cannot be its own ancestor.")}
                )
            node = node.parent

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# --------------------------------------------------------------------------- #
# Brand
# --------------------------------------------------------------------------- #
class Brand(TimeStampedModel):
    """Manufacturer / brand of a product."""

    name = models.CharField(_("name"), max_length=120, unique=True)
    slug = models.SlugField(_("slug"), max_length=140, unique=True, blank=True)
    logo = models.ImageField(
        _("logo"), upload_to="brands/logos/", null=True, blank=True
    )
    description = models.TextField(_("description"), blank=True)
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        verbose_name = _("brand")
        verbose_name_plural = _("brands")
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# --------------------------------------------------------------------------- #
# Product
# --------------------------------------------------------------------------- #
class Product(TimeStampedModel):
    """Base product. Concrete sellable units live in `ProductVariant`."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        PUBLISHED = "PUBLISHED", _("Published")
        OUT_OF_STOCK = "OUT_OF_STOCK", _("Out of Stock")

    title = models.CharField(_("title"), max_length=200)
    slug = models.SlugField(_("slug"), max_length=220, unique=True, blank=True)
    description = models.TextField(_("description"), blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
        verbose_name=_("category"),
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.PROTECT,
        related_name="products",
        null=True,
        blank=True,
        verbose_name=_("brand"),
    )
    base_price = models.DecimalField(
        _("base price"),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    status = models.CharField(
        _("status"),
        max_length=12,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    specifications = JSONField(
        _("specifications"),
        default=dict,
        blank=True,
        help_text=_(
            "Dynamic properties validated against the category schema, e.g. "
            '{"weight": "300g", "material": "Carbon Fiber"}'
        ),
    )
    is_featured = models.BooleanField(_("featured"), default=False)

    class Meta:
        verbose_name = _("product")
        verbose_name_plural = _("products")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["category", "brand"]),
        ]

    def __str__(self) -> str:
        return self.title

    def clean(self) -> None:
        """Validate specifications against the (effective) category schema."""
        super().clean()
        if self.category_id:
            schema = self.category.get_effective_schema()
            validate_specifications(schema, self.specifications)

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    # -- pricing/stock helpers ------------------------------------------ #
    @property
    def total_stock(self) -> int:
        """Aggregate stock across all variants."""
        return sum(v.stock_quantity for v in self.variants.all())

    @property
    def in_stock(self) -> bool:
        return self.total_stock > 0


# --------------------------------------------------------------------------- #
# Product images
# --------------------------------------------------------------------------- #
class ProductImage(TimeStampedModel):
    """An ordered image attached to a product."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name=_("product"),
    )
    image = models.ImageField(_("image"), upload_to="products/images/")
    alt_text = models.CharField(_("alt text"), max_length=200, blank=True)
    is_primary = models.BooleanField(_("primary"), default=False)
    sort_order = models.PositiveIntegerField(_("sort order"), default=0)

    class Meta:
        verbose_name = _("product image")
        verbose_name_plural = _("product images")
        ordering = ("sort_order", "id")

    def __str__(self) -> str:
        return f"Image #{self.pk} for {self.product_id}"


# --------------------------------------------------------------------------- #
# Product variant (concrete inventory)
# --------------------------------------------------------------------------- #
class ProductVariant(TimeStampedModel):
    """
    A concrete, sellable variation of a product (size/color/etc.).

    Final price is `product.base_price + price_modifier`. The `attributes`
    JSONB holds the discriminating options, e.g. {"size": 42, "color": "Red"}.
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
        verbose_name=_("product"),
    )
    sku = models.CharField(_("SKU"), max_length=64, unique=True)
    price_modifier = models.DecimalField(
        _("price modifier"),
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text=_("Amount added to (or subtracted from) the base price."),
    )
    stock_quantity = models.PositiveIntegerField(
        _("stock quantity"),
        default=0,
        validators=[MinValueValidator(0)],
    )
    attributes = JSONField(
        _("attributes"),
        default=dict,
        blank=True,
        help_text=_('Discriminating options, e.g. {"size": 42, "color": "Red"}'),
    )
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        verbose_name = _("product variant")
        verbose_name_plural = _("product variants")
        ordering = ("product", "sku")
        constraints = [
            models.UniqueConstraint(
                fields=["product", "attributes"],
                name="uniq_variant_attributes_per_product",
            )
        ]
        indexes = [models.Index(fields=["sku"])]

    def __str__(self) -> str:
        return f"{self.product.title} [{self.sku}]"

    @property
    def final_price(self) -> Decimal:
        """Effective sell price for this variant."""
        return (self.product.base_price or Decimal("0.00")) + self.price_modifier

    @property
    def is_in_stock(self) -> bool:
        return self.is_active and self.stock_quantity > 0

    def clean(self) -> None:
        super().clean()
        from django.core.exceptions import ValidationError

        if not isinstance(self.attributes, dict):
            raise ValidationError({"attributes": _("Attributes must be a JSON object.")})
        if self.sku:
            # Normalise SKU to a predictable, case-insensitive-unique form.
            self.sku = self.sku.strip().upper()
