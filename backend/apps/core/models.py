"""
Shared abstract base models.

`TimeStampedModel` is an abstract base — it creates no database table of its
own; concrete models that inherit it gain `created_at` / `updated_at` columns.
Centralising it here removes the per-app duplication and gives every domain a
single, consistent timestamp contract.
"""

from __future__ import annotations

from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """Reusable created/updated timestamps for all domain models."""

    created_at = models.DateTimeField(_("تاریخ ایجاد"), auto_now_add=True)
    updated_at = models.DateTimeField(_("تاریخ به‌روزرسانی"), auto_now=True)

    class Meta:
        abstract = True
