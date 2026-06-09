"""Serializers for the analytics app."""

from __future__ import annotations

from rest_framework import serializers

from apps.analytics.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Read-only representation of an audit-log entry."""

    admin_user_id = serializers.IntegerField(
        source="admin_user.id", read_only=True, default=None
    )

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "admin_user_id",
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
        read_only_fields = fields
