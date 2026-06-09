"""WebSocket URL routing for the chat app."""

from __future__ import annotations

from django.urls import path

from apps.chat.consumers import ChatConsumer

websocket_urlpatterns = [
    # Customers connect here; an active room is auto-resolved/created.
    #   ws://127.0.0.1:8000/ws/chat/?token=<JWT>
    path("ws/chat/", ChatConsumer.as_asgi()),
    # Admins/Owners join a specific room by id.
    #   ws://127.0.0.1:8000/ws/chat/<room_id>/?token=<JWT>
    path("ws/chat/<int:room_id>/", ChatConsumer.as_asgi()),
]
