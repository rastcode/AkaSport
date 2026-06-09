"""URL routing for the analytics app (mounted under `/api/analytics/`)."""

from django.urls import path

from apps.analytics.views import (
    AuditLogListView,
    CachedCategoryTreeView,
    CachedProductListView,
    OwnerDashboardView,
)

app_name = "analytics"

urlpatterns = [
    # Owner-only analytics
    path("dashboard/", OwnerDashboardView.as_view(), name="dashboard"),
    path("audit-logs/", AuditLogListView.as_view(), name="audit-logs"),
    # Cached public catalog endpoints (performance)
    path("catalog/products/", CachedProductListView.as_view(), name="cached-products"),
    path("catalog/categories/", CachedCategoryTreeView.as_view(), name="cached-categories"),
]
