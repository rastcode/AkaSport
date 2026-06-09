"""
Faceted filtering for the product catalog.

Built on `django-filter`. Beyond the standard scalar filters (category, brand,
price range, status), `ProductFilter` exposes a dynamic JSONB facet filter that
queries *inside* the `specifications` (product) and `attributes` (variant)
JSONB columns.

Query syntax for the dynamic facet filter (`spec`):

    ?spec=color:Red                 -> specifications.color == "Red"
    ?spec=weight__lt:500            -> specifications.weight < 500
    ?spec=material:Carbon,size:42   -> AND of multiple facets

Supported operators: exact (default), lt, lte, gt, gte, icontains.
On PostgreSQL these compile to JSONB key lookups.
"""

from __future__ import annotations

from typing import Any

import django_filters
from django.db.models import Q, QuerySet

from apps.products.models import Category, Product

# operator suffix -> Django ORM lookup applied to the JSON key transform.
_OPERATOR_LOOKUPS: dict[str, str] = {
    "exact": "",
    "lt": "__lt",
    "lte": "__lte",
    "gt": "__gt",
    "gte": "__gte",
    "icontains": "__icontains",
}


class ProductFilter(django_filters.FilterSet):
    """Advanced product filtering with JSONB faceting."""

    # --- scalar facets ------------------------------------------------- #
    category = django_filters.ModelChoiceFilter(
        field_name="category", queryset=Category.objects.all()
    )
    category_slug = django_filters.CharFilter(
        field_name="category__slug", lookup_expr="iexact"
    )
    # Include descendant categories (tree-aware browsing).
    in_category = django_filters.NumberFilter(method="filter_in_category")

    brand = django_filters.NumberFilter(field_name="brand_id")
    brand_slug = django_filters.CharFilter(
        field_name="brand__slug", lookup_expr="iexact"
    )

    min_price = django_filters.NumberFilter(field_name="base_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="base_price", lookup_expr="lte")

    status = django_filters.ChoiceFilter(choices=Product.Status.choices)
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock")

    # --- dynamic JSONB facets ----------------------------------------- #
    # Query inside Product.specifications, e.g. ?spec=color:Red,weight__lt:500
    spec = django_filters.CharFilter(method="filter_specifications")
    # Query inside ProductVariant.attributes, e.g. ?attr=size:42,color:Red
    attr = django_filters.CharFilter(method="filter_variant_attributes")

    class Meta:
        model = Product
        fields = [
            "category",
            "brand",
            "status",
            "is_featured",
        ]

    # ------------------------------------------------------------------ #
    # Custom methods
    # ------------------------------------------------------------------ #
    def filter_in_category(
        self, queryset: QuerySet, name: str, value: Any
    ) -> QuerySet:
        """Match the given category and all of its descendants."""
        try:
            root = Category.objects.get(pk=value)
        except Category.DoesNotExist:
            return queryset.none()

        ids = self._collect_descendant_ids(root)
        return queryset.filter(category_id__in=ids)

    @staticmethod
    def _collect_descendant_ids(root: Category) -> list[int]:
        ids = [root.pk]
        frontier = [root.pk]
        # Breadth-first walk over the children relation.
        for _ in range(20):  # depth cap
            children = list(
                Category.objects.filter(parent_id__in=frontier).values_list(
                    "id", flat=True
                )
            )
            new = [cid for cid in children if cid not in ids]
            if not new:
                break
            ids.extend(new)
            frontier = new
        return ids

    def filter_in_stock(
        self, queryset: QuerySet, name: str, value: bool
    ) -> QuerySet:
        """Filter products that have (or lack) any in-stock active variant."""
        if value is None:
            return queryset
        has_stock = Q(variants__is_active=True, variants__stock_quantity__gt=0)
        if value:
            return queryset.filter(has_stock).distinct()
        return queryset.exclude(has_stock).distinct()

    def filter_specifications(
        self, queryset: QuerySet, name: str, value: str
    ) -> QuerySet:
        """Apply one or more facets against the `specifications` JSONB field."""
        return self._apply_json_facets(queryset, "specifications", value)

    def filter_variant_attributes(
        self, queryset: QuerySet, name: str, value: str
    ) -> QuerySet:
        """Apply one or more facets against variants' `attributes` JSONB field."""
        return self._apply_json_facets(
            queryset, "variants__attributes", value
        ).distinct()

    # ------------------------------------------------------------------ #
    # JSONB facet parser
    # ------------------------------------------------------------------ #
    @classmethod
    def _apply_json_facets(
        cls, queryset: QuerySet, json_field: str, raw: str
    ) -> QuerySet:
        """
        Parse a comma-separated facet string and AND the resulting lookups.

        Each facet is `key[__op]:value`. Values are coerced to int/float/bool
        when possible so numeric comparisons work against JSONB numbers.
        """
        for facet in cls._parse_facets(raw):
            key, operator, value = facet
            lookup_suffix = _OPERATOR_LOOKUPS.get(operator, "")
            # e.g. specifications__color  /  specifications__weight__lt
            orm_path = f"{json_field}__{key}{lookup_suffix}"
            queryset = queryset.filter(**{orm_path: value})
        return queryset

    @staticmethod
    def _parse_facets(raw: str) -> list[tuple[str, str, Any]]:
        """Parse `'a:1,b__lt:5'` into `[('a','exact',1), ('b','lt',5)]`."""
        facets: list[tuple[str, str, Any]] = []
        for chunk in raw.split(","):
            chunk = chunk.strip()
            if not chunk or ":" not in chunk:
                continue
            key_part, value_part = chunk.split(":", 1)
            key_part = key_part.strip()
            value_part = value_part.strip()

            operator = "exact"
            for suffix in ("__lt", "__lte", "__gt", "__gte", "__icontains"):
                if key_part.endswith(suffix):
                    operator = suffix[2:]
                    key_part = key_part[: -len(suffix)]
                    break

            facets.append((key_part, operator, _coerce(value_part)))
        return facets


def _coerce(value: str) -> Any:
    """Coerce a raw query value to int / float / bool when unambiguous."""
    low = value.lower()
    if low in {"true", "false"}:
        return low == "true"
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        return value
