"""
Analytics & auditing models.

`AuditLog` records sensitive write operations (create/update/delete) performed
by ADMIN/OWNER users, including a structured diff of changed fields.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """An immutable record of a sensitive admin/owner write operation."""

    class ActionType(models.TextChoices):
        CREATE = "CREATE", _("Create")
        UPDATE = "UPDATE", _("Update")
        DELETE = "DELETE", _("Delete")

    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        null=True,
        blank=True,
        verbose_name=_("admin user"),
    )
    # Denormalised identity so the log survives user deletion.
    admin_identifier = models.CharField(
        _("admin identifier"), max_length=255, blank=True
    )
    action_type = models.CharField(
        _("action type"), max_length=10, choices=ActionType.choices, db_index=True
    )
    model_name = models.CharField(_("model name"), max_length=120, db_index=True)
    object_id = models.CharField(_("object id"), max_length=64, db_index=True)
    object_repr = models.CharField(_("object representation"), max_length=255, blank=True)
    changes_json = models.JSONField(
        _("changes"),
        default=dict,
        blank=True,
        help_text=_(
            "Field-level diff: {field: {'old': ..., 'new': ...}}. For creates "
            "the 'old' values are null; for deletes the 'new' values are null."
        ),
    )
    source = models.CharField(
        _("source"),
        max_length=20,
        default="admin",
        help_text=_("Where the change originated: 'admin', 'api', 'system'."),
    )
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)
    timestamp = models.DateTimeField(_("timestamp"), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("audit log")
        verbose_name_plural = _("audit logs")
        ordering = ("-timestamp",)
        indexes = [
            models.Index(fields=["model_name", "object_id"]),
            models.Index(fields=["admin_user", "timestamp"]),
            models.Index(fields=["action_type", "timestamp"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.action_type} {self.model_name}#{self.object_id} "
            f"by {self.admin_identifier or 'system'}"
        )

    @classmethod
    def record(
        cls,
        *,
        admin_user: Any,
        action_type: str,
        model_name: str,
        object_id: Any,
        changes: dict[str, Any] | None = None,
        object_repr: str = "",
        source: str = "system",
        ip_address: str | None = None,
    ) -> "AuditLog":
        """Convenience factory used by the audit signals/middleware."""
        identifier = ""
        if admin_user is not None and getattr(admin_user, "is_authenticated", False):
            identifier = (
                getattr(admin_user, "email", None)
                or getattr(admin_user, "phone_number", None)
                or str(admin_user.pk)
            )
        return cls.objects.create(
            admin_user=admin_user
            if (admin_user is not None and getattr(admin_user, "pk", None))
            else None,
            admin_identifier=identifier,
            action_type=action_type,
            model_name=model_name,
            object_id=str(object_id),
            object_repr=object_repr[:255],
            changes_json=changes or {},
            source=source,
            ip_address=ip_address,
        )
