"""Django admin for chat rooms and messages."""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.chat.models import ChatMessage, ChatRoom


class ChatMessageInline(admin.TabularInline):
    """Read-only message log shown on the room page."""

    model = ChatMessage
    extra = 0
    fields = ("sender", "message", "timestamp")
    readonly_fields = ("sender", "message", "timestamp")
    can_delete = False

    def has_add_permission(self, request, obj=None) -> bool:
        return False


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "admin", "is_active", "created_at", "updated_at")
    list_filter = ("is_active", "created_at")
    search_fields = (
        "id",
        "customer__email",
        "customer__phone_number",
        "admin__email",
    )
    autocomplete_fields = ("customer", "admin")
    readonly_fields = ("created_at", "updated_at")
    inlines = (ChatMessageInline,)
    date_hierarchy = "created_at"


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "sender", "short_message", "timestamp")
    list_filter = ("timestamp",)
    search_fields = ("message", "room__id", "sender__email")
    autocomplete_fields = ("room", "sender")
    readonly_fields = ("timestamp",)

    @admin.display(description=_("Message"))
    def short_message(self, obj: ChatMessage) -> str:
        return (obj.message[:50] + "...") if len(obj.message) > 50 else obj.message
