"""
Chat models.

    ChatRoom    - a support conversation between a customer and (optionally) an
                  assigned admin. `is_active` distinguishes open conversations.
    ChatMessage - an individual message within a room.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ChatRoom(models.Model):
    """A support conversation owned by a customer, optionally staffed by an admin."""

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_chat_rooms",
        verbose_name=_("customer"),
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="admin_chat_rooms",
        null=True,
        blank=True,
        verbose_name=_("assigned admin"),
    )
    is_active = models.BooleanField(_("active"), default=True, db_index=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("chat room")
        verbose_name_plural = _("chat rooms")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["customer", "is_active"]),
            models.Index(fields=["admin", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"ChatRoom#{self.pk} (customer={self.customer_id}, active={self.is_active})"

    @property
    def group_name(self) -> str:
        """Channels group name for this room (stable, namespaced)."""
        return f"chat_room_{self.pk}"

    @property
    def is_assigned(self) -> bool:
        return self.admin_id is not None


class ChatMessage(models.Model):
    """A single message posted to a chat room."""

    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name=_("room"),
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="chat_messages",
        null=True,
        verbose_name=_("sender"),
    )
    message = models.TextField(_("message"))
    timestamp = models.DateTimeField(_("timestamp"), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("chat message")
        verbose_name_plural = _("chat messages")
        ordering = ("timestamp",)
        indexes = [models.Index(fields=["room", "timestamp"])]

    def __str__(self) -> str:
        preview = (self.message[:30] + "...") if len(self.message) > 30 else self.message
        return f"Msg#{self.pk} room={self.room_id}: {preview}"
