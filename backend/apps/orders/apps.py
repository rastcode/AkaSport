"""App configuration for the orders app."""

from django.apps import AppConfig


class OrdersConfig(AppConfig):
    """Configuration for the `orders` app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"
    label = "orders"
    verbose_name = "Cart, Orders & Checkout"
