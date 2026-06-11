"""
Django settings for the AkaSport e-commerce backend.

Infrastructure for Part 1 (Authentication / RBAC / JWT) and Part 2 (Product
Catalog). Settings are 12-factor friendly: secrets and environment-specific
values are read from environment variables (see `.env.example`).
"""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

# --------------------------------------------------------------------------- #
# Optional .env loading (no hard dependency at runtime).
# --------------------------------------------------------------------------- #
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover - dotenv is optional in production
    pass


BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(key: str, default: bool = False) -> bool:
    """Parse a boolean environment variable or fail on an invalid value."""
    raw = os.environ.get(key)
    if raw is None:
        return default

    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ImproperlyConfigured(
        f"{key} must be a boolean: true/false, yes/no, on/off, or 1/0."
    )


def env_list(key: str, default: str = "") -> list[str]:
    """Parse a comma-separated environment variable into a list."""
    raw = os.environ.get(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# --------------------------------------------------------------------------- #
# Core security
# --------------------------------------------------------------------------- #
# Development stays zero-config. Production must explicitly set
# DJANGO_DEBUG=false and provide all required security values below.
DEBUG = env_bool("DJANGO_DEBUG", True)

_INSECURE_DEV_SECRET = "django-insecure-dev-key-change-me-in-production-0123456789abcdef"
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", _INSECURE_DEV_SECRET if DEBUG else ""
).strip()
_INSECURE_SECRET_VALUES = {
    "",
    "change-me",
    "change-me-to-a-long-random-string",
    _INSECURE_DEV_SECRET,
}
if not DEBUG and SECRET_KEY in _INSECURE_SECRET_VALUES:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set to a unique, non-placeholder value "
        "when DJANGO_DEBUG=false."
    )

ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1" if DEBUG else "",
)
if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "DJANGO_ALLOWED_HOSTS must contain at least one hostname when "
        "DJANGO_DEBUG=false."
    )

# --------------------------------------------------------------------------- #
# Security headers
# --------------------------------------------------------------------------- #
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
# Trust this header only when the deployment proxy overwrites it.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = (
    not DEBUG and env_bool("DJANGO_SECURE_SSL_REDIRECT", False)
)
SESSION_COOKIE_SECURE = (
    not DEBUG and env_bool("DJANGO_SESSION_COOKIE_SECURE", True)
)
CSRF_COOKIE_SECURE = (
    not DEBUG and env_bool("DJANGO_CSRF_COOKIE_SECURE", True)
)
SECURE_HSTS_SECONDS = (
    int(os.environ.get("DJANGO_SECURE_HSTS_SECONDS", "0")) if not DEBUG else 0
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = (
    not DEBUG
    and SECURE_HSTS_SECONDS > 0
    and env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
)
SECURE_HSTS_PRELOAD = (
    not DEBUG
    and SECURE_HSTS_SECONDS > 0
    and env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)
)

# --------------------------------------------------------------------------- #
# CORS — allow the Next.js storefront (separate origin in dev) to call the API.
# --------------------------------------------------------------------------- #
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000" if DEBUG else "",
)
# The SPA sends the JWT in the Authorization header (not cookies), so we don't
# need credentialed CORS; keep it off for a tighter default.
CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", False)
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000" if DEBUG else "",
)


# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #
DJANGO_APPS = [
    # `daphne` must precede `django.contrib.staticfiles` so that `runserver`
    # is served by the ASGI/Daphne dev server (required for WebSockets).
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "channels",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
]

LOCAL_APPS = [
    "apps.core",          # shared base models / foundation
    "apps.authentication",
    "apps.catalog",       # new Persian catalog domain (supersedes apps.products)
    "apps.products",      # legacy — retained until cart/orders migrate to catalog
    "apps.orders",
    "apps.chat",
    "apps.analytics",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # CORS must sit as high as possible and before CommonMiddleware so that
    # cross-origin requests from the Next.js storefront (localhost:3000) are
    # answered with the right headers.
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Captures the acting admin/owner for audit logging (Part 5). Must sit
    # after AuthenticationMiddleware so request.user is populated.
    "apps.analytics.middleware.audit_log.AuditLogMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
# Channels routes both HTTP and WebSocket through the ASGI application.
ASGI_APPLICATION = "config.asgi.application"


# --------------------------------------------------------------------------- #
# Database
#
# SQLite is used by default for a zero-config dev experience. The JSONField
# columns in `apps.products` map to native JSONB when DATABASE_URL points at
# PostgreSQL (recommended for production so JSONB key lookups are indexed).
# --------------------------------------------------------------------------- #
if os.environ.get("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["POSTGRES_DB"],
            "USER": os.environ.get("POSTGRES_USER", "postgres"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# --------------------------------------------------------------------------- #
# Custom user model
# --------------------------------------------------------------------------- #
AUTH_USER_MODEL = "authentication.CustomUser"


# --------------------------------------------------------------------------- #
# Password validation
# --------------------------------------------------------------------------- #
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation."
        "UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# --------------------------------------------------------------------------- #
# Internationalization
# --------------------------------------------------------------------------- #
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# --------------------------------------------------------------------------- #
# Static & media files
# --------------------------------------------------------------------------- #
STATIC_URL = "static/"
# اسلش ابتدایی لازم است تا URLهای رسانه به‌درستی مطلق شوند (مثلاً /media/...).
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
MAX_IMAGE_UPLOAD_SIZE_MB = int(os.environ.get("MAX_IMAGE_UPLOAD_SIZE_MB", "5"))
MAX_IMAGE_DIMENSION = int(os.environ.get("MAX_IMAGE_DIMENSION", "8000"))
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --------------------------------------------------------------------------- #
# Django REST Framework
# --------------------------------------------------------------------------- #
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": os.environ.get("AUTH_LOGIN_THROTTLE_RATE", "5/min"),
        "auth_otp_request": os.environ.get(
            "AUTH_OTP_REQUEST_THROTTLE_RATE", "3/min"
        ),
        "auth_otp_verify": os.environ.get(
            "AUTH_OTP_VERIFY_THROTTLE_RATE", "5/min"
        ),
    },
    # در production فقط JSON؛ مرورگرِ DRF فقط در DEBUG فعال است.
    "DEFAULT_RENDERER_CLASSES": (
        ("rest_framework.renderers.JSONRenderer",)
        + (
            ("rest_framework.renderers.BrowsableAPIRenderer",)
            if DEBUG
            else ()
        )
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": (
        "rest_framework.pagination.PageNumberPagination"
    ),
    "PAGE_SIZE": int(os.environ.get("PAGE_SIZE", "20")),
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
}


# --------------------------------------------------------------------------- #
# SimpleJWT
# --------------------------------------------------------------------------- #
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "30"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.environ.get("JWT_REFRESH_DAYS", "7"))
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": (
        "apps.authentication.serializers.CustomTokenObtainPairSerializer"
    ),
}


# --------------------------------------------------------------------------- #
# Authentication backends
# --------------------------------------------------------------------------- #
AUTHENTICATION_BACKENDS = [
    "apps.authentication.backends.MultiFieldModelBackend",
    "django.contrib.auth.backends.ModelBackend",
]


# --------------------------------------------------------------------------- #
# Domain settings: OTP
# --------------------------------------------------------------------------- #
OTP_EXPIRY_MINUTES = int(os.environ.get("OTP_EXPIRY_MINUTES", "5"))
OTP_MAX_ATTEMPTS = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
OTP_LENGTH = 6


# --------------------------------------------------------------------------- #
# Domain settings: Pricing & Shipping (Part 3)
# --------------------------------------------------------------------------- #
# Currency precision is 2 decimal places throughout.
# Free shipping above this order subtotal (after discount). Set 0 to disable.
SHIPPING_FREE_THRESHOLD = os.environ.get("SHIPPING_FREE_THRESHOLD", "150.00")
# Flat base handling fee added to every shipped order.
SHIPPING_BASE_FEE = os.environ.get("SHIPPING_BASE_FEE", "5.00")
# Per-kilogram shipping rate (heavy sports gear pays more).
SHIPPING_RATE_PER_KG = os.environ.get("SHIPPING_RATE_PER_KG", "2.50")
# Assumed weight (grams) for a unit whose product/variant declares no weight.
SHIPPING_DEFAULT_ITEM_WEIGHT_G = int(
    os.environ.get("SHIPPING_DEFAULT_ITEM_WEIGHT_G", "500")
)
# VIP strategy: extra discount fraction applied for OWNER/ADMIN (demo campaign).
VIP_DISCOUNT_RATE = os.environ.get("VIP_DISCOUNT_RATE", "0.10")


# --------------------------------------------------------------------------- #
# Channels / WebSockets (Part 4)
#
# Redis is the channel-layer broker. Run it locally with:
#   docker run --rm -p 6379:6379 --name akasport-redis redis:7-alpine
# In development without Redis, set CHANNELS_IN_MEMORY=1 to use the in-memory
# layer (single-process only; NOT suitable for production).
# --------------------------------------------------------------------------- #
REDIS_HOST = os.environ.get("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))
REDIS_URL = os.environ.get("REDIS_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

if env_bool("CHANNELS_IN_MEMORY", DEBUG):
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
                "capacity": 1500,
                "expiry": 10,
            },
        }
    }


# --------------------------------------------------------------------------- #
# Caching (Part 5) — Redis-backed via django-redis.
#
# Uses Redis DB 1 (the channel layer uses DB 0 implicitly) to keep cache and
# pub/sub data separate. Falls back to a local in-memory cache when
# CACHE_IN_MEMORY=1 so the project runs without Redis in development.
# --------------------------------------------------------------------------- #
CACHE_TIMEOUT_PRODUCTS = int(os.environ.get("CACHE_TIMEOUT_PRODUCTS", str(60 * 15)))

if env_bool("CACHE_IN_MEMORY", DEBUG):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "akasport-locmem",
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": os.environ.get(
                "REDIS_CACHE_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/1"
            ),
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "IGNORE_EXCEPTIONS": True,  # never let a cache outage 500 a view
            },
            "KEY_PREFIX": "akasport",
            "TIMEOUT": CACHE_TIMEOUT_PRODUCTS,
        }
    }

# Cache key fragments used by the catalog cache + its invalidation signal.
CATALOG_CACHE_KEYS = {
    "product_list": "catalog:product_list",
    "category_tree": "catalog:category_tree",
}
# (Phase 0) cache keys above are consumed by the catalog cache-invalidation signal.

# Image optimization (Part 5).
IMAGE_OPTIMIZE_ENABLED = env_bool("IMAGE_OPTIMIZE_ENABLED", True)
IMAGE_MAX_DIMENSIONS = (
    int(os.environ.get("IMAGE_MAX_WIDTH", "1600")),
    int(os.environ.get("IMAGE_MAX_HEIGHT", "1600")),
)
IMAGE_WEBP_QUALITY = int(os.environ.get("IMAGE_WEBP_QUALITY", "80"))
