"""HTTP URL routing for the chat app (mounted under `/api/chat/`)."""

from django.urls import path

from apps.chat.views import (
    ChatMessageHistoryView,
    ChatRoomListView,
    OpenChatRoomListView,
)

app_name = "chat"

urlpatterns = [
    path("rooms/", ChatRoomListView.as_view(), name="room-list"),
    path("rooms/open/", OpenChatRoomListView.as_view(), name="open-room-list"),
    path(
        "rooms/<int:room_id>/messages/",
        ChatMessageHistoryView.as_view(),
        name="room-messages",
    ),
]
