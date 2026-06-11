import warnings
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible
from PIL import Image, UnidentifiedImageError


@deconstructible
class SecureCatalogImageValidator:
    allowed_formats = {
        "JPEG": ({".jpg", ".jpeg"}, ".jpg", "image/jpeg"),
        "PNG": ({".png"}, ".png", "image/png"),
        "WEBP": ({".webp"}, ".webp", "image/webp"),
    }

    def __call__(self, uploaded_file):
        max_size_mb = settings.MAX_IMAGE_UPLOAD_SIZE_MB
        max_size_bytes = max_size_mb * 1024 * 1024

        if uploaded_file.size > max_size_bytes:
            raise ValidationError(
                f"حجم تصویر نباید بیشتر از {max_size_mb} مگابایت باشد."
            )

        original_position = uploaded_file.tell()
        try:
            uploaded_file.seek(0)
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(uploaded_file) as image:
                    image_format = image.format
                    width, height = image.size
                    image.verify()
        except Image.DecompressionBombError as exc:
            raise ValidationError(
                "ابعاد تصویر بیش از حد مجاز است."
            ) from exc
        except (
            Image.DecompressionBombWarning,
            UnidentifiedImageError,
            OSError,
            SyntaxError,
            ValueError,
        ) as exc:
            raise ValidationError(
                "فایل انتخاب‌شده تصویر معتبر و سالمی نیست."
            ) from exc
        finally:
            uploaded_file.seek(original_position)

        if image_format not in self.allowed_formats:
            raise ValidationError(
                "فرمت تصویر معتبر نیست. فقط فایل JPG، PNG یا WebP مجاز است."
            )

        max_dimension = settings.MAX_IMAGE_DIMENSION
        if width > max_dimension or height > max_dimension:
            raise ValidationError(
                f"ابعاد تصویر نباید بیشتر از "
                f"{max_dimension}×{max_dimension} پیکسل باشد."
            )

        allowed_extensions, extension, expected_mime = self.allowed_formats[
            image_format
        ]
        submitted_extension = Path(uploaded_file.name).suffix.lower()
        if submitted_extension not in allowed_extensions:
            raise ValidationError(
                "پسوند فایل با فرمت واقعی تصویر مطابقت ندارد."
            )

        declared_mime = getattr(uploaded_file, "content_type", None)
        if declared_mime and declared_mime.lower() != expected_mime:
            raise ValidationError(
                "نوع اعلام‌شده فایل با محتوای واقعی تصویر مطابقت ندارد."
            )

        uploaded_file.name = f"{uuid4().hex}{extension}"

    def __eq__(self, other):
        return isinstance(other, self.__class__)


validate_catalog_image = SecureCatalogImageValidator()
