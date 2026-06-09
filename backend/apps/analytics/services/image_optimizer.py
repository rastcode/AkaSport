"""
Image optimization pipeline (Pillow).

`optimize_image_field` takes a Django `ImageField` file, downscales it to fit
within configured max dimensions, strips metadata, and re-encodes it as WebP at
a reduced quality — dramatically shrinking heavy sports-gear photos for fast
frontend rendering.

The function is idempotent and defensive: any failure (unsupported format,
corrupt upload, missing Pillow) is logged and the original file is left
untouched, so a bad image never blocks a save.
"""

from __future__ import annotations

import io
import logging
import os
from dataclasses import dataclass
from typing import Optional

from django.conf import settings
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

try:
    from PIL import Image, ImageOps

    _PILLOW_AVAILABLE = True
except ImportError:  # pragma: no cover
    _PILLOW_AVAILABLE = False


@dataclass(frozen=True)
class OptimizationResult:
    """Outcome of an optimization attempt."""

    changed: bool
    new_name: Optional[str] = None
    original_bytes: int = 0
    optimized_bytes: int = 0

    @property
    def saved_bytes(self) -> int:
        return max(self.original_bytes - self.optimized_bytes, 0)

    @property
    def ratio(self) -> float:
        if not self.original_bytes:
            return 0.0
        return round(self.optimized_bytes / self.original_bytes, 3)


def _max_dimensions() -> tuple[int, int]:
    return tuple(getattr(settings, "IMAGE_MAX_DIMENSIONS", (1600, 1600)))  # type: ignore[return-value]


def _quality() -> int:
    return int(getattr(settings, "IMAGE_WEBP_QUALITY", 80))


def optimize_image_field(image_field, *, save_field: bool = False) -> OptimizationResult:
    """
    Optimize the file held by a Django ImageField in place.

    Args:
        image_field: an `ImageFieldFile` (e.g. `instance.image`).
        save_field:  if True, persist the field's owning model after replacing
                     the file. Usually False — callers save the model once.

    Returns an `OptimizationResult`. Never raises on image errors.
    """
    if not getattr(settings, "IMAGE_OPTIMIZE_ENABLED", True):
        return OptimizationResult(changed=False)
    if not _PILLOW_AVAILABLE:
        logger.warning("Pillow is not installed; skipping image optimization.")
        return OptimizationResult(changed=False)
    if not image_field:
        return OptimizationResult(changed=False)

    name = getattr(image_field, "name", "") or ""
    # Skip files that are already optimized WebP to keep the operation idempotent.
    if name.lower().endswith(".webp"):
        return OptimizationResult(changed=False)

    try:
        image_field.open("rb")
        raw = image_field.read()
    except Exception as exc:  # pragma: no cover - storage/IO guard
        logger.error("Could not read image '%s' for optimization: %s", name, exc)
        return OptimizationResult(changed=False)
    finally:
        try:
            image_field.close()
        except Exception:
            pass

    original_size = len(raw)

    try:
        webp_bytes = _transcode_to_webp(raw)
    except Exception as exc:
        logger.error("Image optimization failed for '%s': %s", name, exc)
        return OptimizationResult(changed=False, original_bytes=original_size)

    new_name = _webp_name(name)
    # Replace the file on the field without triggering a recursive optimize:
    # the new name ends in .webp, which the guard above short-circuits.
    image_field.save(new_name, ContentFile(webp_bytes), save=save_field)

    result = OptimizationResult(
        changed=True,
        new_name=image_field.name,
        original_bytes=original_size,
        optimized_bytes=len(webp_bytes),
    )
    logger.info(
        "Optimized image '%s' -> '%s' (%d -> %d bytes, ratio %.2f)",
        name,
        image_field.name,
        result.original_bytes,
        result.optimized_bytes,
        result.ratio,
    )
    return result


def _transcode_to_webp(raw: bytes) -> bytes:
    """Resize + re-encode raw image bytes as optimized WebP."""
    max_w, max_h = _max_dimensions()

    with Image.open(io.BytesIO(raw)) as img:
        # Respect EXIF orientation, then drop EXIF by re-saving.
        img = ImageOps.exif_transpose(img)

        # Flatten alpha onto white for non-transparent target formats; WebP
        # supports alpha, so preserve it but normalise the mode.
        if img.mode in ("P", "LA"):
            img = img.convert("RGBA")
        elif img.mode == "CMYK":
            img = img.convert("RGB")
        elif img.mode not in ("RGB", "RGBA", "L"):
            img = img.convert("RGB")

        # Downscale to fit the bounding box, preserving aspect ratio. Never
        # upscale smaller images.
        img.thumbnail((max_w, max_h), Image.LANCZOS)

        buffer = io.BytesIO()
        save_kwargs = {
            "format": "WEBP",
            "quality": _quality(),
            "method": 6,  # max compression effort
        }
        img.save(buffer, **save_kwargs)
        return buffer.getvalue()


def _webp_name(original_name: str) -> str:
    """Derive a `.webp` filename from the original upload name."""
    base = os.path.basename(original_name)
    stem, _ext = os.path.splitext(base)
    stem = stem or "image"
    return f"{stem}.webp"
