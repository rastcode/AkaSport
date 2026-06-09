"""App configuration for the core (shared foundation) app."""

from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Shared base models, mixins and utilities used across all domains."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    label = "core"
    verbose_name = "هسته‌ی مشترک"
