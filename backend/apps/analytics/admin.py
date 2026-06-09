"""Django admin for the audit log (read-only)."""

from __future__ import annotations

from django.contrib import admin

from apps.analytics.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Read-only audit trail. Entries are never editable from the admin."""

    list_display = (
        "timestamp",
        "action_type",
        "model_name",
        "object_id",
        "admin_identifier",
        "source",
        "ip_address",
    )
    list_filter = ("action_type", "model_name", "source", "timestamp")
    search_fields = ("model_name", "object_id", "admin_identifier", "object_repr")
    date_hierarchy = "timestamp"
    readonly_fields = (
        "admin_user",
        "admin_identifier",
        "action_type",
        "model_name",
        "object_id",
        "object_repr",
        "changes_json",
        "source",
        "ip_address",
        "timestamp",
    )

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        # Only the OWNER (superuser) may prune the audit trail.
        return bool(request.user and request.user.is_superuser)
