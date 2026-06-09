"""
Catalog cache helpers.

Caching strategy: a monotonically increasing *version* number is stored in
Redis and embedded in every catalog cache key. "Invalidation" simply bumps the
version, which atomically orphans all previously cached catalog responses
(they expire naturally). This is race-free and avoids expensive key scans —
ideal when `cache_page` generates many per-querystring variants.
"""

from __future__ import annotations

from django.conf import settings
from django.core.cache import cache

_VERSION_KEY = "catalog:cache:version"


def get_catalog_version() -> int:
    """Return the current catalog cache version, initialising it if absent."""
    version = cache.get(_VERSION_KEY)
    if version is None:
        cache.set(_VERSION_KEY, 1, timeout=None)
        return 1
    return int(version)


def bump_catalog_version() -> int:
    """
    Invalidate all catalog caches by incrementing the version.

    Uses Redis' atomic INCR via django-redis; falls back to get/set for the
    locmem backend used in tests.
    """
    try:
        return cache.incr(_VERSION_KEY)
    except ValueError:
        # Key did not exist yet — initialise then it's effectively invalidated.
        cache.set(_VERSION_KEY, 1, timeout=None)
        return 1


def catalog_cache_key_prefix() -> str:
    """Key prefix used by the cache_page decorator's key function."""
    return f"catalog:v{get_catalog_version()}"


def catalog_timeout() -> int:
    return int(getattr(settings, "CACHE_TIMEOUT_PRODUCTS", 60 * 15))
