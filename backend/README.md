# AkaSport Backend — Part 1: Auth, Custom User & Multi-Auth JWT (RBAC)

Production-oriented Django + DRF authentication layer for the AkaSport sports-goods
store, built with Clean Architecture (separated models, managers, services, serializers,
views, permissions).

## Features

- **Custom user model** (`CustomUser`) — no `username`; identity is `email` *or*
  `phone_number` (both unique, validated). Strict 3-tier role system: `OWNER`,
  `ADMIN`, `CUSTOMER`.
- **Custom `UserManager`** — correct `create_user` / `create_superuser` around the new
  identity fields; superuser is forced to `OWNER`.
- **Multi-auth via Factory pattern** (`AuthServiceFactory`) routing to:
  - `EmailAuthService` — email/phone + password
  - `OTPAuthService` — phone + 6-digit OTP (mock SMS to console)
  - `OAuth2AuthService` — documented extension point
- **SimpleJWT** with custom claims: `role`, `email`, `phone_number` embedded in the
  access token.
- **RBAC permissions** — `IsOwner`, `IsAdmin` (admin∪owner), `IsCustomer`,
  `IsOwnerOrReadOnly` (object-level).
- **Django admin** — custom `UserAdmin` for managing roles, identities and permissions.

## Project layout

```
config/                 # project settings, root urls, wsgi/asgi
apps/authentication/
  models.py             # CustomUser, OTPVerification
  managers.py           # CustomUserManager
  backends.py           # email-or-phone auth backend
  services.py           # AuthServiceFactory + strategy classes (Factory pattern)
  serializers.py        # register/login/otp/me + custom JWT claims
  permissions.py        # IsOwner / IsAdmin / IsCustomer / IsOwnerOrReadOnly
  views.py              # DRF API views
  urls.py               # /api/auth/* routes
  admin.py              # CustomUserAdmin + OTPVerificationAdmin
  exceptions.py         # domain API exceptions
```

## Quickstart

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # then edit secrets
python manage.py makemigrations authentication
python manage.py migrate
python manage.py createsuperuser                     # creates an OWNER
python manage.py runserver
```

> `createsuperuser` will prompt for email/phone/password. Because `username` is removed,
> authentication uses the email/phone identifier.

## API

| Method | Endpoint                   | Auth     | Purpose                                   |
|--------|----------------------------|----------|-------------------------------------------|
| POST   | `/api/auth/register/`      | Public   | Customer registration                     |
| POST   | `/api/auth/login/`         | Public   | Unified login (Factory-dispatched)        |
| POST   | `/api/auth/otp/request/`   | Public   | Request a new OTP (printed to console)     |
| POST   | `/api/auth/otp/verify/`    | Public   | Verify OTP → JWT pair                      |
| GET/PATCH | `/api/auth/me/`         | Bearer   | Current user profile                      |
| POST   | `/api/auth/token/refresh/` | Public   | Exchange refresh token                    |

### Examples

Register:
```bash
curl -X POST localhost:8000/api/auth/register/ -H "Content-Type: application/json" \
  -d '{"email":"sam@example.com","phone_number":"+989121234567","password":"StrongPass9","password_confirm":"StrongPass9"}'
```

Password login (method inferred from payload):
```bash
curl -X POST localhost:8000/api/auth/login/ -H "Content-Type: application/json" \
  -d '{"identifier":"sam@example.com","password":"StrongPass9"}'
```

OTP login:
```bash
# 1) request — code prints to the server console as a mock SMS
curl -X POST localhost:8000/api/auth/otp/request/ -H "Content-Type: application/json" \
  -d '{"phone_number":"+989121234567"}'
# 2) verify
curl -X POST localhost:8000/api/auth/otp/verify/ -H "Content-Type: application/json" \
  -d '{"phone_number":"+989121234567","code":"123456"}'
```

Authenticated profile:
```bash
curl localhost:8000/api/auth/me/ -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Security notes

- OTPs are single-use, time-boxed (`OTP_EXPIRY_MINUTES`), attempt-capped
  (`OTP_MAX_ATTEMPTS`), and compared in constant time. The `debug_code` field in the
  OTP-request response is for local development only — remove it in production and store
  a **hash** of the code rather than plaintext.
- `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS` are environment-driven; never ship the
  bundled dev secret.
