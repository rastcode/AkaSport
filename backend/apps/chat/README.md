# Part 4 — Real-time Live Chat Support (Django Channels + Redis)

Asynchronous, JWT-authenticated WebSocket chat between customers and support
admins, built on Django Channels with a Redis channel layer.

## 1. Dependencies

Added to `requirements.txt`:

```
channels>=4.1
channels-redis>=4.2
daphne>=4.1
websockets>=12.0        # only for the standalone test client
```

Install:

```bash
pip install -r requirements.txt
```

## 2. Run Redis (channel-layer broker)

```bash
docker run --rm -p 6379:6379 --name akasport-redis redis:7-alpine
```

> No Docker / no Redis? For single-process local dev only, set
> `CHANNELS_IN_MEMORY=1` in your environment to use the in-memory channel
> layer. Do **not** use it in production or with multiple workers.

## 3. Settings wiring (already applied in `config/settings.py`)

- `daphne` is the first entry in `INSTALLED_APPS` so `runserver` serves ASGI.
- `channels` is installed; `apps.chat` is registered.
- `ASGI_APPLICATION = "config.asgi.application"`.
- `CHANNEL_LAYERS` points at Redis (`channels_redis.core.RedisChannelLayer`).

## 4. Run the ASGI server

```bash
python manage.py migrate
python manage.py runserver        # Daphne-backed (HTTP + WebSocket)
# or explicitly with Daphne:
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

## 5. Endpoints

WebSocket:

| URL | Who | Behaviour |
|-----|-----|-----------|
| `ws://127.0.0.1:8000/ws/chat/?token=<JWT>` | Customer | Finds/creates the customer's active room |
| `ws://127.0.0.1:8000/ws/chat/<room_id>/?token=<JWT>` | Admin/Owner | Joins (and claims if unassigned) the room |

Inbound frame: `{"message": "text"}`
Broadcast frame:
```json
{"type":"message","message_id":12,"room_id":1,"sender_id":5,
 "sender_role":"CUSTOMER","message":"Hello","timestamp":"2026-..."}
```

REST (history & admin queue), under `/api/chat/`:

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/chat/rooms/` | Own rooms (customer) / all (admin); `?status=active\|closed` |
| GET | `/api/chat/rooms/open/` | Admin-only queue; `?unassigned=true\|false` |
| GET | `/api/chat/rooms/<id>/messages/` | Paginated history (ownership enforced) |

Close codes: `4401` unauthenticated, `4403` forbidden (admin without room id),
`4404` room not found.

## 6. Local verification

1. Start Redis and the server (steps 2 & 4).
2. Get a token:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/auth/login/ \
        -H "Content-Type: application/json" \
        -d '{"identifier":"customer@example.com","password":"StrongPass9"}'
   ```
3. **Browser:** open `tests/chat_simulator.html`, paste the token, Connect, send.
   Open a second tab with an admin token + the room id to see live two-way flow.
4. **CLI:**
   ```bash
   python tests/ws_client.py --token "<ACCESS_TOKEN>" --message "Hello support!"
   # interactive streaming:
   python tests/ws_client.py --token "<ACCESS_TOKEN>" --interactive
   # admin joining room 1:
   python tests/ws_client.py --token "<ADMIN_TOKEN>" --room 1 --message "Hi!"
   ```
