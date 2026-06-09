"""Serializers for chat rooms and message history."""

from __future__ import annotations

from rest_framework import serializers

from apps.chat.models import ChatMessage, ChatRoom


class ChatMessageSerializer(serializers.ModelSerializer):
    """Read representation of a stored chat message."""

    sender_id = serializers.IntegerField(source="sender.id", read_only=True, default=None)
    sender_role = serializers.CharField(
        source="sender.role", read_only=True, default=None
    )

    class Meta:
        model = ChatMessage
        fields = ("id", "room", "sender_id", "sender_role", "message", "timestamp")
        read_only_fields = fields


class ChatRoomSerializer(serializers.ModelSerializer):
    """Room summary including counts and last-message preview."""

    customer_id = serializers.IntegerField(source="customer.id", read_only=True)
    admin_id = serializers.IntegerField(
        source="admin.id", read_only=True, default=None
    )
    is_assigned = serializers.BooleanField(read_only=True)
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = (
            "id",
            "customer_id",
            "admin_id",
            "is_active",
            "is_assigned",
            "message_count",
            "last_message",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_message_count(self, obj: ChatRoom) -> int:
        # Uses an annotation when present to avoid an extra query.
        annotated = getattr(obj, "message_count_annotated", None)
        return annotated if annotated is not None else obj.messages.count()

    def get_last_message(self, obj: ChatRoom) -> dict | None:
        last = obj.messages.order_by("-timestamp").first()
        if last is None:
            return None
        return {
            "message": last.message,
            "sender_id": last.sender_id,
            "timestamp": last.timestamp.isoformat(),
        }
