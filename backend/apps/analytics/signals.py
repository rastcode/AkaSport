"""
Signal handlers wiring together the Part 5 cross-cutting concerns.

1. Cache invalidation — any write to Product / Category / ProductVariant bumps
   the catalog cache version, instantly orphaning stale cached responses.
2. Image optimization — ProductImage / Brand images are transcoded to WebP
   right after save (post_save) so heavy uploads are shrunk transparently.
3. Audit logging — Product / Category / ProductVariant / Coupon / Order writes
   by ADMIN/OWNER users are recorded in `AuditLog` with a field-level diff.

All handlers are defensive: a failure in a cross-cutting concern must never
break the primary write. Handlers are connected from `AnalyticsConfig.ready()`.
"""

from __future__ import annotations

import logging
from typing import Any

from django.db.models.signals import (
    post_delete,
    post_save,
    pre_save,
)
from django.dispatch import receiver

from apps.analytics.cache import bump_catalog_version
from apps.analytics.middleware.audit_log import get_current_ip, get_current_user
from apps.analytics.models import AuditLog
from apps.orders.models import Coupon, Order
from apps.products.models import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductVariant,
)

logger = logging.getLogger(__name__)

# Models whose changes invalidate the public catalog cache.
_CATALOG_MODELS = (Product, Category, ProductVariant)
# Models whose admin/owner writes are audited (+ their tracked fields).
_AUDITED_MODELS = (Product, Category, ProductVariant, Brand, Coupon, Order)
# Fields excluded from audit diffs (noisy / non-meaningful).
_AUDIT_IGNORED_FIELDS = {"updated_at", "created_at", "used_count"}


# ======================================================================= #
# 1. Catalog cache invalidation
# ======================================================================= #
def _invalidate_catalog_cache(sender: type, **kwargs: Any) -> None:
    try:
        bump_catalog_version()
        logger.debug("Catalog cache invalidated by %s change.", sender.__name__)
    except Exception as exc:  # pragma: no cover - cache outage guard
        logger.warning("Catalog cache invalidation failed: %s", exc)


for _model in _CATALOG_MODELS:
    post_save.connect(
        _invalidate_catalog_cache,
        sender=_model,
        dispatch_uid=f"catalog_cache_save_{_model.__name__}",
    )
    post_delete.connect(
        _invalidate_catalog_cache,
        sender=_model,
        dispatch_uid=f"catalog_cache_delete_{_model.__name__}",
    )


# ======================================================================= #
# 2. Image optimization
# ======================================================================= #
@receiver(post_save, sender=ProductImage, dispatch_uid="optimize_product_image")
def optimize_product_image(sender: type, instance: ProductImage, **kwargs: Any) -> None:
    """Transcode a freshly-saved product image to optimized WebP."""
    _safe_optimize(instance, "image")


@receiver(post_save, sender=Brand, dispatch_uid="optimize_brand_logo")
def optimize_brand_logo(sender: type, instance: Brand, **kwargs: Any) -> None:
    """Transcode a brand logo to optimized WebP."""
    _safe_optimize(instance, "logo")


def _safe_optimize(instance: Any, field_name: str) -> None:
    from apps.analytics.services.image_optimizer import optimize_image_field

    field = getattr(instance, field_name, None)
    if not field:
        return
    try:
        result = optimize_image_field(field, save_field=False)
        if result.changed:
            # Persist only the changed file-field name via a queryset .update():
            # this writes directly to the DB without re-emitting post_save, so
            # there's no recursion and unrelated fields are left untouched. The
            # new name ends in .webp, which the optimizer short-circuits anyway.
            type(instance).objects.filter(pk=instance.pk).update(
                **{field_name: field.name}
            )
    except Exception as exc:  # pragma: no cover - never break the save
        logger.error("Image optimization signal failed: %s", exc)


# ======================================================================= #
# 3. Audit logging (admin/owner writes only)
# ======================================================================= #
def _is_privileged(user: Any) -> bool:
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and getattr(user, "is_admin", False)  # ADMIN or OWNER (Part 1)
    )


def _serialize_value(value: Any) -> Any:
    """Make a field value JSON-serialisable for the diff payload."""
    from datetime import date, datetime
    from decimal import Decimal
    from uuid import UUID

    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (dict, list)):
        return value
    return str(value)


def _snapshot(instance: Any) -> dict[str, Any]:
    """Capture a JSON-safe snapshot of a model's local (non-relation) fields."""
    data: dict[str, Any] = {}
    for field in instance._meta.local_fields:
        if field.name in _AUDIT_IGNORED_FIELDS:
            continue
        # Use attname so FKs are captured as `<field>_id` scalars.
        data[field.attname] = _serialize_value(getattr(instance, field.attname, None))
    return data


def _diff(old: dict[str, Any], new: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Field-level diff between two snapshots."""
    changes: dict[str, dict[str, Any]] = {}
    keys = set(old) | set(new)
    for key in keys:
        old_val = old.get(key)
        new_val = new.get(key)
        if old_val != new_val:
            changes[key] = {"old": old_val, "new": new_val}
    return changes


@receiver(pre_save, dispatch_uid="audit_capture_previous")
def audit_capture_previous(sender: type, instance: Any, **kwargs: Any) -> None:
    """Stash the pre-change DB state on the instance for an accurate diff."""
    if sender not in _AUDITED_MODELS or instance.pk is None:
        return
    try:
        previous = sender.objects.get(pk=instance.pk)
        instance.__audit_previous = _snapshot(previous)  # type: ignore[attr-defined]
    except sender.DoesNotExist:
        instance.__audit_previous = None  # type: ignore[attr-defined]


@receiver(post_save, dispatch_uid="audit_log_save")
def audit_log_save(sender: type, instance: Any, created: bool, **kwargs: Any) -> None:
    """Record a CREATE or UPDATE performed by a privileged user."""
    if sender not in _AUDITED_MODELS:
        return
    user = get_current_user()
    if not _is_privileged(user):
        return

    try:
        new_snapshot = _snapshot(instance)
        if created:
            action = AuditLog.ActionType.CREATE
            changes = {k: {"old": None, "new": v} for k, v in new_snapshot.items()}
        else:
            action = AuditLog.ActionType.UPDATE
            # `__audit_previous` was stashed by `audit_capture_previous`.
            # (No name mangling here: these are module-level functions.)
            old_snapshot = getattr(instance, "__audit_previous", None) or {}
            changes = _diff(old_snapshot, new_snapshot)
            if not changes:
                return  # nothing meaningful changed

        AuditLog.record(
            admin_user=user,
            action_type=action,
            model_name=sender.__name__,
            object_id=instance.pk,
            object_repr=str(instance),
            changes=changes,
            source="api",
            ip_address=get_current_ip(),
        )
    except Exception as exc:  # pragma: no cover - never break the write
        logger.error("Audit logging (save) failed for %s: %s", sender.__name__, exc)


@receiver(post_delete, dispatch_uid="audit_log_delete")
def audit_log_delete(sender: type, instance: Any, **kwargs: Any) -> None:
    """Record a DELETE performed by a privileged user."""
    if sender not in _AUDITED_MODELS:
        return
    user = get_current_user()
    if not _is_privileged(user):
        return

    try:
        snapshot = _snapshot(instance)
        changes = {k: {"old": v, "new": None} for k, v in snapshot.items()}
        AuditLog.record(
            admin_user=user,
            action_type=AuditLog.ActionType.DELETE,
            model_name=sender.__name__,
            object_id=instance.pk,
            object_repr=str(instance),
            changes=changes,
            source="api",
            ip_address=get_current_ip(),
        )
    except Exception as exc:  # pragma: no cover
        logger.error("Audit logging (delete) failed for %s: %s", sender.__name__, exc)
