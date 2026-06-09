"""App configuration for the chat app."""

from django.apps import AppConfig


class ChatConfig(AppConfig):
    """Configuration for the `chat` app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.chat"
    label = "chat"
    verbose_name = "Real-time Chat Support"
