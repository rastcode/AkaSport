"""
Asynchronous WebSocket consumer for live chat support.

Connection lifecycle:
    connect()    - authenticate (via scope["user"], set by JWTAuthMiddleware),
                   resolve the target room by role, join its Channels group,
                   and replay nothing (history is fetched over REST).
    receive()    - parse an inbound JSON frame, persist the message, and
                   broadcast it to everyone in the room group.
    disconnect() - discard the channel from the group (Redis cleanup).

Role behaviour:
    * CUSTOMER       -> finds their active room or creates one.
    * ADMIN / OWNER  -> joins an explicit room id (from the URL) and is
                        recorded as the room's assigned admin if unassigned.
"""

from __future__ import annotations

import json
from typing import Any, Optional

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from apps.chat.models import ChatMessage, ChatRoom

# WebSocket application-level close codes.
CLOSE_UNAUTHENTICATED = 4401
CLOSE_FORBIDDEN = 4403
CLOSE_ROOM_NOT_FOUND = 4404


class ChatConsumer(AsyncWebsocketConsumer):
    """Async consumer powering customer<->admin support chat."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.user: Any = None
        self.room: Optional[ChatRoom] = None
        self.room_group_name: str = ""

    # ------------------------------------------------------------------ #
    # Connect
    # ------------------------------------------------------------------ #
    async def connect(self) -> None:
        self.user = self.scope.get("user")

        # Reject anonymous / invalid-token connections.
        if self.user is None or not getattr(self.user, "is_authenticated", False):
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return

        role = getattr(self.user, "role", None)
        room_id = self.scope.get("url_route", {}).get("kwargs", {}).get("room_id")

        try:
            if getattr(self.user, "is_admin", False):
                # ADMIN / OWNER: must target a specific room.
                if room_id is None:
                    await self.close(code=CLOSE_FORBIDDEN)
                    return
                self.room = await self._get_room_for_admin(room_id)
            else:
                # CUSTOMER: resolve their active room, or create one.
                self.room = await self._get_or_create_room_for_customer()
        except ChatRoom.DoesNotExist:
            await self.close(code=CLOSE_ROOM_NOT_FOUND)
            return
        except PermissionError:
            await self.close(code=CLOSE_FORBIDDEN)
            return

        self.room_group_name = self.room.group_name

        # Join the room group on the channel layer (Redis).
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Notify the room that a participant joined.
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.system",
                "event": "join",
                "room_id": self.room.pk,
                "user_id": self.user.id,
                "role": role,
            },
        )

    # ------------------------------------------------------------------ #
    # Receive
    # ------------------------------------------------------------------ #
    async def receive(
        self, text_data: Optional[str] = None, bytes_data: Optional[bytes] = None
    ) -> None:
        if not text_data:
            await self._send_error("Empty frame; expected JSON text.")
            return

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            await self._send_error("Invalid JSON payload.")
            return

        message_text = (payload.get("message") or "").strip()
        if not message_text:
            await self._send_error("Field 'message' is required and cannot be empty.")
            return
        if len(message_text) > 5000:
            await self._send_error("Message exceeds the 5000 character limit.")
            return

        # Persist the message, then broadcast it to the whole room group.
        message = await self._save_message(message_text)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "message_id": message.pk,
                "room_id": self.room.pk,
                "sender_id": self.user.id,
                "sender_role": getattr(self.user, "role", None),
                "message_text": message.message,
                "timestamp": message.timestamp.isoformat(),
            },
        )

    # ------------------------------------------------------------------ #
    # Disconnect
    # ------------------------------------------------------------------ #
    async def disconnect(self, code: int) -> None:
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )
            if self.room is not None and self.user is not None:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat.system",
                        "event": "leave",
                        "room_id": self.room.pk,
                        "user_id": getattr(self.user, "id", None),
                        "role": getattr(self.user, "role", None),
                    },
                )

    # ------------------------------------------------------------------ #
    # Group event handlers (invoked by channel_layer.group_send "type")
    # ------------------------------------------------------------------ #
    async def chat_message(self, event: dict[str, Any]) -> None:
        """Forward a broadcast chat message to this client."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message",
                    "message_id": event["message_id"],
                    "room_id": event["room_id"],
                    "sender_id": event["sender_id"],
                    "sender_role": event["sender_role"],
                    "message": event["message_text"],
                    "timestamp": event["timestamp"],
                }
            )
        )

    async def chat_system(self, event: dict[str, Any]) -> None:
        """Forward a system event (join/leave) to this client."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "system",
                    "event": event["event"],
                    "room_id": event["room_id"],
                    "user_id": event["user_id"],
                    "role": event["role"],
                    "timestamp": timezone.now().isoformat(),
                }
            )
        )

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    async def _send_error(self, detail: str) -> None:
        await self.send(
            text_data=json.dumps({"type": "error", "detail": detail})
        )

    @database_sync_to_async
    def _get_or_create_room_for_customer(self) -> ChatRoom:
        """Return the customer's active room, creating one if none exists."""
        room = (
            ChatRoom.objects.filter(customer=self.user, is_active=True)
            .order_by("-created_at")
            .first()
        )
        if room is None:
            room = ChatRoom.objects.create(customer=self.user, is_active=True)
        return room

    @database_sync_to_async
    def _get_room_for_admin(self, room_id: int) -> ChatRoom:
        """
        Fetch the room an admin wants to join; assign them if unassigned.

        Raises `ChatRoom.DoesNotExist` if the room id is unknown.
        """
        room = ChatRoom.objects.get(pk=room_id)
        if room.admin_id is None:
            room.admin = self.user
            room.save(update_fields=["admin", "updated_at"])
        return room

    @database_sync_to_async
    def _save_message(self, message_text: str) -> ChatMessage:
        """Persist a message and touch the room's `updated_at`."""
        message = ChatMessage.objects.create(
            room=self.room, sender=self.user, message=message_text
        )
        ChatRoom.objects.filter(pk=self.room.pk).update(updated_at=timezone.now())
        return message
