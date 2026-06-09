"""
REST endpoints for chat history and room management.

These complement the WebSocket layer: real-time delivery happens over the
socket, while these endpoints provide paginated history and the admin queue of
open/unassigned rooms.

    GET /api/chat/rooms/                 - list rooms (own for customers, all
                                           for admins; supports ?status= filter)
    GET /api/chat/rooms/open/            - admin-only: open/unassigned rooms
    GET /api/chat/rooms/<id>/messages/   - paginated message history for a room
"""

from __future__ import annotations

from typing import Any

from django.db.models import Count, QuerySet
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from apps.authentication.permissions import IsAdmin
from apps.chat.models import ChatMessage, ChatRoom
from apps.chat.serializers import ChatMessageSerializer, ChatRoomSerializer


class ChatRoomListView(generics.ListAPIView):
    """
    List chat rooms.

    Customers see only their own rooms; ADMIN/OWNER roles see all rooms.
    Optional `?status=active|closed` filter.
    """

    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[ChatRoom]:
        user = self.request.user
        qs = ChatRoom.objects.select_related("customer", "admin").annotate(
            message_count_annotated=Count("messages")
        )
        if not getattr(user, "is_admin", False):
            qs = qs.filter(customer=user)

        status = self.request.query_params.get("status")
        if status == "active":
            qs = qs.filter(is_active=True)
        elif status == "closed":
            qs = qs.filter(is_active=False)
        return qs.order_by("-updated_at")


class OpenChatRoomListView(generics.ListAPIView):
    """
    Admin queue: active rooms, optionally only unassigned ones.

    `?unassigned=true` (default) returns rooms with no admin yet; pass
    `?unassigned=false` to include rooms already being handled.
    """

    serializer_class = ChatRoomSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self) -> QuerySet[ChatRoom]:
        qs = (
            ChatRoom.objects.select_related("customer", "admin")
            .annotate(message_count_annotated=Count("messages"))
            .filter(is_active=True)
        )
        unassigned = self.request.query_params.get("unassigned", "true").lower()
        if unassigned in {"1", "true", "yes"}:
            qs = qs.filter(admin__isnull=True)
        return qs.order_by("created_at")


class ChatMessageHistoryView(generics.ListAPIView):
    """
    Paginated message history for a single room.

    Access control: customers may only read their own room; admins may read any.
    """

    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[ChatMessage]:
        room = self._get_authorized_room()
        return ChatMessage.objects.filter(room=room).order_by("timestamp")

    def _get_authorized_room(self) -> ChatRoom:
        room_id = self.kwargs["room_id"]
        try:
            room = ChatRoom.objects.select_related("customer", "admin").get(
                pk=room_id
            )
        except ChatRoom.DoesNotExist as exc:
            from rest_framework.exceptions import NotFound

            raise NotFound("Chat room not found.") from exc

        user = self.request.user
        if getattr(user, "is_admin", False):
            return room
        if room.customer_id == user.id:
            return room
        raise PermissionDenied("You do not have access to this chat room.")
