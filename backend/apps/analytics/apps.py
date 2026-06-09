"""App configuration for the analytics app."""

from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """Configuration for the `analytics` app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.analytics"
    label = "analytics"
    verbose_name = "Analytics, Caching & Audit"

    def ready(self) -> None:
        """Connect signal handlers (cache invalidation, audit, image opt)."""
        # Importing registers the @receiver-decorated handlers.
        from apps.analytics import signals  # noqa: F401
