"""App configuration for the catalog app."""

from django.apps import AppConfig


class CatalogConfig(AppConfig):
    """Configuration for the `catalog` app (Persian e-commerce catalog)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalog"
    label = "catalog"
    verbose_name = "کاتالوگ محصولات"
