"""
Owner analytics dashboard + cached public catalog views.

`OwnerDashboardView` is restricted to OWNER (Part 1 `IsOwner`) and uses ORM
aggregation (`Sum`, `Count`, `Avg`, `TruncDay`) to assemble revenue, order, and
inventory metrics. The cached catalog views demonstrate `cache_page` over the
heavy Part 2 endpoints, invalidated by the catalog cache-version signal.
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.db.models import (
    Avg,
    Count,
    DecimalField,
    F,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce, TruncDay
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework import generics, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.models import AuditLog
from apps.analytics.serializers import AuditLogSerializer
from apps.authentication.permissions import IsOwner
from apps.orders.models import Order, OrderItem
from apps.products.models import ProductVariant

# Order statuses that count as realised revenue.
REVENUE_STATUSES = (
    Order.Status.PAID,
    Order.Status.PROCESSING,
    Order.Status.SHIPPED,
)
LOW_STOCK_THRESHOLD = 3

_DECIMAL = DecimalField(max_digits=14, decimal_places=2)


def _range_start(period: str, now) -> Any:
    """Map a period keyword to its window start datetime (None = all time)."""
    if period == "daily":
        return now - timedelta(days=1)
    if period == "weekly":
        return now - timedelta(weeks=1)
    if period == "monthly":
        return now - timedelta(days=30)
    if period == "yearly":
        return now - timedelta(days=365)
    return None  # "all"


class OwnerDashboardView(APIView):
    """
    `GET /api/analytics/dashboard/?period=daily|weekly|monthly|yearly|all`

    OWNER-only aggregated reporting.
    """

    permission_classes = [IsOwner]

    def get(self, request: Request) -> Response:
        period = (request.query_params.get("period") or "monthly").lower()
        now = timezone.now()
        start = _range_start(period, now)

        revenue_orders = Order.objects.filter(status__in=REVENUE_STATUSES)
        if start is not None:
            revenue_orders = revenue_orders.filter(created_at__gte=start)

        summary = self._summary(revenue_orders)
        timeseries = self._daily_timeseries(revenue_orders)
        top_variants = self._top_selling_variants(start)
        low_stock = self._low_stock_alerts()

        return Response(
            {
                "period": period,
                "generated_at": now.isoformat(),
                "summary": summary,
                "revenue_by_day": timeseries,
                "top_selling_variants": top_variants,
                "low_stock_alerts": low_stock,
            },
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------ #
    # Aggregations
    # ------------------------------------------------------------------ #
    @staticmethod
    def _summary(revenue_orders) -> dict[str, Any]:
        agg = revenue_orders.aggregate(
            total_revenue=Coalesce(
                Sum("total_amount"), Value(Decimal("0.00")), output_field=_DECIMAL
            ),
            total_orders=Count("id"),
            average_order_value=Coalesce(
                Avg("total_amount"), Value(Decimal("0.00")), output_field=_DECIMAL
            ),
            total_discount=Coalesce(
                Sum("discount_amount"), Value(Decimal("0.00")), output_field=_DECIMAL
            ),
            total_shipping=Coalesce(
                Sum("shipping_cost"), Value(Decimal("0.00")), output_field=_DECIMAL
            ),
        )
        return {
            "total_revenue": str(agg["total_revenue"]),
            "total_orders": agg["total_orders"],
            "average_order_value": str(
                Decimal(agg["average_order_value"]).quantize(Decimal("0.01"))
            ),
            "total_discount": str(agg["total_discount"]),
            "total_shipping": str(agg["total_shipping"]),
        }

    @staticmethod
    def _daily_timeseries(revenue_orders) -> list[dict[str, Any]]:
        rows = (
            revenue_orders.annotate(day=TruncDay("created_at"))
            .values("day")
            .annotate(
                revenue=Coalesce(
                    Sum("total_amount"), Value(Decimal("0.00")), output_field=_DECIMAL
                ),
                orders=Count("id"),
            )
            .order_by("day")
        )
        return [
            {
                "date": row["day"].date().isoformat() if row["day"] else None,
                "revenue": str(row["revenue"]),
                "orders": row["orders"],
            }
            for row in rows
        ]

    @staticmethod
    def _top_selling_variants(start) -> list[dict[str, Any]]:
        """Top 5 best-selling variants by units sold (in realised orders)."""
        qs = OrderItem.objects.filter(order__status__in=REVENUE_STATUSES)
        if start is not None:
            qs = qs.filter(order__created_at__gte=start)

        rows = (
            qs.values("product_variant_id", "variant_sku", "product_title")
            .annotate(
                units_sold=Coalesce(Sum("quantity"), Value(0)),
                revenue=Coalesce(
                    Sum(F("quantity") * F("price_at_purchase")),
                    Value(Decimal("0.00")),
                    output_field=_DECIMAL,
                ),
            )
            .order_by("-units_sold")[:5]
        )
        return [
            {
                "product_variant_id": row["product_variant_id"],
                "sku": row["variant_sku"],
                "product_title": row["product_title"],
                "units_sold": row["units_sold"],
                "revenue": str(row["revenue"]),
            }
            for row in rows
        ]

    @staticmethod
    def _low_stock_alerts() -> list[dict[str, Any]]:
        """All active variants at or below the low-stock threshold."""
        rows = (
            ProductVariant.objects.select_related("product")
            .filter(is_active=True, stock_quantity__lte=LOW_STOCK_THRESHOLD)
            .order_by("stock_quantity")
        )
        return [
            {
                "product_variant_id": v.id,
                "sku": v.sku,
                "product_title": v.product.title,
                "stock_quantity": v.stock_quantity,
                "attributes": v.attributes,
            }
            for v in rows
        ]


class AuditLogListView(generics.ListAPIView):
    """`GET /api/analytics/audit-logs/` — OWNER-only audit trail (paginated)."""

    serializer_class = AuditLogSerializer
    permission_classes = [IsOwner]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("admin_user").all()
        model_name = self.request.query_params.get("model")
        action = self.request.query_params.get("action")
        if model_name:
            qs = qs.filter(model_name__iexact=model_name)
        if action:
            qs = qs.filter(action_type=action.upper())
        return qs.order_by("-timestamp")


# --------------------------------------------------------------------------- #
# Cached public catalog views (heavy, infrequently changing — Part 2 data)
# --------------------------------------------------------------------------- #
CACHE_SECONDS = 60 * 15


@method_decorator(cache_page(CACHE_SECONDS), name="dispatch")
@method_decorator(vary_on_headers("Authorization"), name="dispatch")
class CachedProductListView(generics.ListAPIView):
    """
    Cached landing-page product list (published products only).

    The response is cached for 15 minutes; the catalog cache-invalidation
    signal bumps the cache version on any Product/Category/Variant write, so
    edits are reflected on the next request rather than after TTL expiry.
    """

    from apps.products.serializers import ProductListSerializer

    serializer_class = ProductListSerializer
    permission_classes: list = []  # public

    def get_queryset(self):
        from apps.products.models import Product

        return (
            Product.objects.filter(status=Product.Status.PUBLISHED)
            .select_related("category", "brand")
            .prefetch_related("images")
            .order_by("-is_featured", "-created_at")
        )


@method_decorator(cache_page(CACHE_SECONDS), name="dispatch")
class CachedCategoryTreeView(APIView):
    """Cached category tree for the storefront navigation."""

    permission_classes: list = []  # public

    def get(self, request: Request) -> Response:
        from apps.products.models import Category
        from apps.products.serializers import CategoryTreeSerializer

        roots = Category.objects.filter(
            parent__isnull=True, is_active=True
        ).prefetch_related("children")
        data = CategoryTreeSerializer(
            roots, many=True, context={"request": request}
        ).data
        return Response(data)
