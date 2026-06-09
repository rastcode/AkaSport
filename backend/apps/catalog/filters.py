"""
Faceted filtering + ordering for the catalog product list.

Works on a queryset that the view has already annotated with:
    * `eff_price`  - Coalesce(discount_price, base_price)      (for price sort/range)
    * `disc_ratio` - percentage discount off base price        (for highest_discount)
    * `in_stock`   - Exists(active variant with stock > 0)     (for in_stock filter)

The dynamic `spec` parameter queries inside the `specifications` JSONB field:
    ?spec=رنگ:قرمز,جنس:پنبه   ->  specifications.رنگ == "قرمز" AND specifications.جنس == "پنبه"
"""

from __future__ import annotations

from typing import Any

import django_filters
from django.db.models import F, Q, QuerySet

from apps.catalog.models import Brand, Category, Product

# UI sort keyword -> order_by argument (annotations resolved in the view).
ORDERING_MAP: dict[str, str] = {
    "newest": "-created_at",
    "cheapest": "eff_price",
    "most_expensive": "-eff_price",
    "most_viewed": "-view_count",
    "best_selling": "-sold_count",
    "highest_discount": "-disc_ratio",
}


class ProductFilter(django_filters.FilterSet):
    """Digikala-style product filtering."""

    # --- scalar facets ------------------------------------------------- #
    category = django_filters.CharFilter(method="filter_category")
    brand = django_filters.CharFilter(method="filter_brand")
    min_price = django_filters.NumberFilter(field_name="eff_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="eff_price", lookup_expr="lte")
    color = django_filters.CharFilter(method="filter_color")
    size = django_filters.CharFilter(method="filter_size")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock")
    has_discount = django_filters.BooleanFilter(method="filter_has_discount")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")

    # --- dynamic JSON spec facet --------------------------------------- #
    spec = django_filters.CharFilter(method="filter_spec")

    # --- ordering (param: ?ordering=newest|cheapest|...) --------------- #
    ordering = django_filters.ChoiceFilter(
        method="filter_ordering",
        choices=[(k, k) for k in ORDERING_MAP],
    )

    class Meta:
        model = Product
        fields = ["category", "brand", "is_featured"]

    # ------------------------------------------------------------------ #
    # Category (tree-aware): match a slug and all of its descendants.
    # ------------------------------------------------------------------ #
    def filter_category(
        self, queryset: QuerySet, name: str, value: str
    ) -> QuerySet:
        if not value:
            return queryset
        try:
            root = Category.objects.get(slug=value)
        except Category.DoesNotExist:
            return queryset.none()
        ids = self._descendant_ids(root)
        return queryset.filter(category_id__in=ids)

    @staticmethod
    def _descendant_ids(root: Category) -> list[int]:
        ids = [root.pk]
        frontier = [root.pk]
        for _ in range(20):  # depth cap
            children = list(
                Category.objects.filter(parent_id__in=frontier).values_list(
                    "id", flat=True
                )
            )
            new = [c for c in children if c not in ids]
            if not new:
                break
            ids.extend(new)
            frontier = new
        return ids

    def filter_brand(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        if not value:
            return queryset
        # Accept a brand slug or a numeric id.
        if value.isdigit():
            return queryset.filter(brand_id=int(value))
        return queryset.filter(brand__slug=value)

    # ------------------------------------------------------------------ #
    # Variant facets (color / size) — accept an id or a name/value.
    # ------------------------------------------------------------------ #
    def filter_color(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        if not value:
            return queryset
        if value.isdigit():
            cond = Q(variants__color_id=int(value))
        else:
            cond = Q(variants__color__name_fa=value)
        return queryset.filter(cond, variants__is_active=True).distinct()

    def filter_size(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        if not value:
            return queryset
        if value.isdigit():
            cond = Q(variants__size_id=int(value))
        else:
            cond = Q(variants__size__value=value)
        return queryset.filter(cond, variants__is_active=True).distinct()

    def filter_in_stock(
        self, queryset: QuerySet, name: str, value: bool
    ) -> QuerySet:
        if value is None:
            return queryset
        # `in_stock` is an annotated boolean (Exists) provided by the view.
        return queryset.filter(in_stock=value)

    def filter_has_discount(
        self, queryset: QuerySet, name: str, value: bool
    ) -> QuerySet:
        if value is None:
            return queryset
        discounted = Q(discount_price__isnull=False) & Q(
            discount_price__lt=F("base_price")
        )
        return queryset.filter(discounted) if value else queryset.exclude(discounted)

    # ------------------------------------------------------------------ #
    # Dynamic JSON specifications: ?spec=key:value,key2:value2
    # ------------------------------------------------------------------ #
    def filter_spec(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        for chunk in value.split(","):
            chunk = chunk.strip()
            if not chunk or ":" not in chunk:
                continue
            key, val = chunk.split(":", 1)
            key = key.strip()
            val = val.strip()
            if key:
                queryset = queryset.filter(**{f"specifications__{key}": val})
        return queryset

    # ------------------------------------------------------------------ #
    # Ordering
    # ------------------------------------------------------------------ #
    def filter_ordering(
        self, queryset: QuerySet, name: str, value: str
    ) -> QuerySet:
        order_by = ORDERING_MAP.get(value)
        return queryset.order_by(order_by) if order_by else queryset


def models_f_base():
    """Return an F() expression for `base_price` (kept tiny for readability)."""
    from django.db.models import F

    return F("base_price")
