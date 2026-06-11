"""
DRF serializers for the catalog API (Persian-first).

Read serializers are optimised for the public storefront (nested variants /
images, computed prices). Admin write serializers handle create/update with
atomic nested-variant management.

Money fields use `decimal_places=0` (Toman). Computed model properties
(`effective_price`, `discount_percent`, `has_discount`, `is_in_stock`) are
exposed via same-named read-only fields — DRF reads the property automatically.
"""

from __future__ import annotations

from typing import Any, Optional

from django.db import transaction
from django.db.models import Avg
from rest_framework import serializers

from apps.catalog.models import (
    Brand,
    Category,
    Color,
    Product,
    ProductImage,
    ProductReview,
    ProductVariant,
    Size,
    WishlistItem,
)


def _is_wishlisted(serializer: serializers.Serializer, obj: "Product") -> bool:
    """آیا این محصول در علاقه‌مندی‌های کاربرِ درخواست است؟ (بهینه با context)."""
    ids = serializer.context.get("wishlisted_ids")
    if ids is not None:
        return obj.id in ids
    request = serializer.context.get("request")
    user = getattr(request, "user", None)
    if not (user and getattr(user, "is_authenticated", False)):
        return False
    return WishlistItem.objects.filter(user=user, product=obj).exists()


# --------------------------------------------------------------------------- #
# Lookups: Category / Brand / Color / Size
# --------------------------------------------------------------------------- #
class CategoryListSerializer(serializers.ModelSerializer):
    """Flat category representation with breadcrumb path."""

    full_path = serializers.CharField(read_only=True)

    class Meta:
        model = Category
        fields = (
            "id",
            "name_fa",
            "name_en",
            "slug",
            "parent",
            "full_path",
            "icon",
            "image",
            "is_active",
            "display_order",
            "dynamic_attributes_schema",
        )


class CategoryTreeSerializer(serializers.ModelSerializer):
    """Recursive category subtree (active children only)."""

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name_fa", "name_en", "slug", "icon", "children")

    def get_children(self, obj: Category) -> list[dict[str, Any]]:
        children = getattr(obj, "active_children", None)
        if children is None:
            children = obj.children.filter(is_active=True).order_by(
                "display_order", "name_fa"
            )
        return CategoryTreeSerializer(children, many=True, context=self.context).data


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = (
            "id",
            "name_fa",
            "name_en",
            "slug",
            "logo",
            "description_fa",
            "is_active",
        )


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ("id", "name_fa", "hex_code", "is_active")


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ("id", "name_fa", "value", "display_order")


# --------------------------------------------------------------------------- #
# Images & variants
# --------------------------------------------------------------------------- #
class ProductImageSerializer(serializers.ModelSerializer):
    """
    تصویر محصول/تنوع.

    فیلد `image` هم برای خواندن و هم نوشتن است: روی خواندن، URL مطلق برمی‌گرداند
    (با کمک request در context) و روی نوشتن، فایل تصویر را از multipart می‌پذیرد.
    بنابراین رفتار قبلیِ خواندن (دریافت URL) حفظ می‌شود و آپلود نیز ممکن می‌شود.
    """

    # `image` قابل نوشتن (دریافت فایل از multipart). در پاسخ، با to_representation
    # به URL مطلق (image_url) تبدیل می‌شود تا رفتار قبلیِ خواندن حفظ شود.
    image = serializers.ImageField(
        required=True,
        error_messages={
            "required": "لطفاً فایل تصویر را انتخاب کنید.",
            "invalid": (
                "فایل انتخاب‌شده تصویر معتبر نیست. لطفاً یک تصویر JPG، PNG یا WebP "
                "سالم انتخاب کنید."
            ),
            "invalid_image": (
                "فایل انتخاب‌شده تصویر معتبر نیست. لطفاً یک تصویر JPG، PNG یا WebP "
                "سالم انتخاب کنید."
            ),
            "empty": "فایل تصویر خالی است.",
            "no_name": "نام فایل تصویر نامعتبر است.",
        },
    )
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductImage
        fields = (
            "id",
            "product",
            "variant",
            "image",
            "image_url",
            "alt_text_fa",
            "is_primary",
            "display_order",
            "created_at",
        )
        read_only_fields = ("id", "image_url", "created_at")
        extra_kwargs = {
            "variant": {"required": False, "allow_null": True},
            "alt_text_fa": {"required": False, "allow_blank": True},
            "is_primary": {"required": False},
            "display_order": {"required": False},
        }

    def get_image_url(self, obj: ProductImage) -> Optional[str]:
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url

    def to_representation(self, instance: ProductImage) -> dict[str, Any]:
        # در خروجی، `image` همان URL مطلق باشد (سازگار با فرانتِ فعلی).
        data = super().to_representation(instance)
        data["image"] = data.get("image_url")
        return data

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        product = attrs.get("product") or getattr(self.instance, "product", None)
        variant = attrs.get("variant") or getattr(self.instance, "variant", None)
        if variant is not None and product is not None and variant.product_id != product.id:
            raise serializers.ValidationError(
                {"variant": "این تنوع متعلق به محصول انتخاب‌شده نیست."}
            )
        return attrs


class ProductVariantSerializer(serializers.ModelSerializer):
    """Customer-facing variant: nested color/size, computed price & stock."""

    color = ColorSerializer(read_only=True)
    size = SizeSerializer(read_only=True)
    effective_price = serializers.DecimalField(
        max_digits=12, decimal_places=0, read_only=True
    )
    is_in_stock = serializers.BooleanField(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "sku",
            "color",
            "size",
            "attributes",
            "price",
            "discount_price",
            "effective_price",
            "stock_quantity",
            "is_in_stock",
            "is_active",
            "images",
        )


# --------------------------------------------------------------------------- #
# Product (read)
# --------------------------------------------------------------------------- #
class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight product card for listing pages.

    `brand` و `category` به‌صورت شیء فشرده (id/name_fa/slug) برگردانده می‌شوند تا
    فرانت بتواند پیوندهایی مثل /products?category=running-shoes بسازد. این فیلدها
    با select_related روی queryset پر می‌شوند و N+1 ایجاد نمی‌کنند.
    """

    brand = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    effective_price = serializers.DecimalField(
        max_digits=12, decimal_places=0, read_only=True
    )
    discount_percent = serializers.IntegerField(read_only=True)
    has_discount = serializers.BooleanField(read_only=True)
    primary_image = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "title_fa",
            "slug",
            "brand",
            "category",
            "base_price",
            "discount_price",
            "effective_price",
            "discount_percent",
            "has_discount",
            "status",
            "is_featured",
            "view_count",
            "in_stock",
            "is_wishlisted",
            "primary_image",
        )

    def get_is_wishlisted(self, obj: Product) -> bool:
        return _is_wishlisted(self, obj)

    def get_brand(self, obj: Product) -> Optional[dict[str, Any]]:
        b = obj.brand
        return {"id": b.id, "name_fa": b.name_fa, "slug": b.slug} if b else None

    def get_category(self, obj: Product) -> Optional[dict[str, Any]]:
        c = obj.category
        return {"id": c.id, "name_fa": c.name_fa, "slug": c.slug} if c else None

    def get_primary_image(self, obj: Product) -> Optional[str]:
        images = list(obj.images.all())
        chosen = next((i for i in images if i.is_primary), images[0] if images else None)
        if not chosen or not chosen.image:
            return None
        request = self.context.get("request")
        url = chosen.image.url
        return request.build_absolute_uri(url) if request else url

    def get_in_stock(self, obj: Product) -> bool:
        annotated = getattr(obj, "in_stock", None)
        if isinstance(annotated, bool):
            return annotated
        return any(v.is_in_stock for v in obj.variants.all())


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full product representation for the detail page."""

    brand = BrandSerializer(read_only=True)
    category = CategoryListSerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    effective_price = serializers.DecimalField(
        max_digits=12, decimal_places=0, read_only=True
    )
    discount_percent = serializers.IntegerField(read_only=True)
    has_discount = serializers.BooleanField(read_only=True)
    effective_schema = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "title_fa",
            "title_en",
            "slug",
            "short_description_fa",
            "description_fa",
            "brand",
            "category",
            "base_price",
            "discount_price",
            "effective_price",
            "discount_percent",
            "has_discount",
            "status",
            "specifications",
            "effective_schema",
            "seo_title",
            "seo_description",
            "view_count",
            "sold_count",
            "is_featured",
            "in_stock",
            "average_rating",
            "reviews_count",
            "is_wishlisted",
            "images",
            "variants",
            "created_at",
            "updated_at",
        )

    def get_is_wishlisted(self, obj: Product) -> bool:
        return _is_wishlisted(self, obj)

    def get_effective_schema(self, obj: Product) -> dict[str, Any]:
        return obj.category.get_effective_schema() if obj.category_id else {}

    def get_reviews_count(self, obj: Product) -> int:
        annotated = getattr(obj, "approved_reviews_count", None)
        if annotated is not None:
            return annotated
        return obj.reviews.filter(status=ProductReview.Status.APPROVED).count()

    def get_average_rating(self, obj: Product) -> Optional[float]:
        annotated = getattr(obj, "approved_average_rating", None)
        if annotated is not None:
            return round(annotated, 1)
        agg = obj.reviews.filter(
            status=ProductReview.Status.APPROVED
        ).aggregate(avg=Avg("rating"))
        return round(agg["avg"], 1) if agg["avg"] is not None else None

    def get_in_stock(self, obj: Product) -> bool:
        annotated = getattr(obj, "in_stock", None)
        if isinstance(annotated, bool):
            return annotated
        return any(v.is_in_stock for v in obj.variants.all())


# --------------------------------------------------------------------------- #
# Admin write serializers
# --------------------------------------------------------------------------- #
class AdminProductVariantWriteSerializer(serializers.ModelSerializer):
    """Create / update a single variant (admin), or nested under a product."""

    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "product",
            "sku",
            "color",
            "size",
            "attributes",
            "price",
            "discount_price",
            "stock_quantity",
            "is_active",
        )
        extra_kwargs = {
            # When nested under a product write, `product` is injected.
            "product": {"required": False},
        }

    def validate_attributes(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise serializers.ValidationError("ویژگی‌ها باید یک شیء JSON باشند.")
        return value


class AdminProductWriteSerializer(serializers.ModelSerializer):
    """
    Create / update a product with optional nested variants.

    Nested writes run inside a single `transaction.atomic()` block. Variants
    with an `id` are updated, those without are created, and existing variants
    omitted from the payload are deleted (full sync).
    """

    variants = AdminProductVariantWriteSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = (
            "id",
            "title_fa",
            "title_en",
            "slug",
            "short_description_fa",
            "description_fa",
            "category",
            "brand",
            "base_price",
            "discount_price",
            "status",
            "specifications",
            "seo_title",
            "seo_description",
            "is_featured",
            "variants",
        )
        read_only_fields = ("id",)
        extra_kwargs = {"slug": {"required": False}}

    # --------------------------- validation ---------------------------- #
    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        discount = attrs.get("discount_price")
        base = attrs.get("base_price", getattr(self.instance, "base_price", None))
        if discount is not None and base is not None and discount > base:
            raise serializers.ValidationError(
                {"discount_price": "قیمت با تخفیف نمی‌تواند بیشتر از قیمت پایه باشد."}
            )
        return attrs

    @staticmethod
    def _validate_unique_skus(variants: list[dict[str, Any]]) -> None:
        skus = [v["sku"].strip().upper() for v in variants if v.get("sku")]
        dupes = {s for s in skus if skus.count(s) > 1}
        if dupes:
            raise serializers.ValidationError(
                {"variants": f"کدهای SKU تکراری در درخواست: {sorted(dupes)}"}
            )

    # ----------------------------- create ------------------------------ #
    def create(self, validated_data: dict[str, Any]) -> Product:
        variants_data: list[dict[str, Any]] = validated_data.pop("variants", [])
        self._validate_unique_skus(variants_data)
        with transaction.atomic():
            product = Product.objects.create(**validated_data)
            for data in variants_data:
                data.pop("id", None)
                data.pop("product", None)
                ProductVariant.objects.create(product=product, **data)
        return product

    # ----------------------------- update ------------------------------ #
    def update(self, instance: Product, validated_data: dict[str, Any]) -> Product:
        variants_data = validated_data.pop("variants", None)
        if variants_data is not None:
            self._validate_unique_skus(variants_data)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if variants_data is not None:
                self._sync_variants(instance, variants_data)
        return instance

    def _sync_variants(
        self, product: Product, variants_data: list[dict[str, Any]]
    ) -> None:
        existing = {v.id: v for v in product.variants.all()}
        seen: set[int] = set()
        for data in variants_data:
            data.pop("product", None)
            variant_id = data.pop("id", None)
            if variant_id and variant_id in existing:
                variant = existing[variant_id]
                for attr, value in data.items():
                    setattr(variant, attr, value)
                variant.save()
                seen.add(variant_id)
            else:
                created = ProductVariant.objects.create(product=product, **data)
                seen.add(created.id)
        stale = set(existing) - seen
        if stale:
            product.variants.filter(id__in=stale).delete()

    def to_representation(self, instance: Product) -> dict[str, Any]:
        return ProductDetailSerializer(instance, context=self.context).data


# --------------------------------------------------------------------------- #
# نظرات محصول
# --------------------------------------------------------------------------- #
def _user_display(user: Any) -> str:
    """نام نمایشیِ کاربر برای نظرات؛ در نبود نام، «کاربر آکامارکت»."""
    name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
    return name or "کاربر آکامارکت"


class ProductReviewSerializer(serializers.ModelSerializer):
    """نظر عمومی محصول (خواندن + ثبت توسط کاربر لاگین‌شده)."""

    user_display = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = (
            "id",
            "rating",
            "title",
            "comment",
            "is_verified_purchase",
            "status",
            "user_display",
            "created_at",
        )
        read_only_fields = (
            "id",
            "is_verified_purchase",
            "status",
            "user_display",
            "created_at",
        )
        extra_kwargs = {
            "rating": {
                "min_value": 1,
                "max_value": 5,
                "error_messages": {
                    "min_value": "امتیاز باید بین ۱ تا ۵ باشد.",
                    "max_value": "امتیاز باید بین ۱ تا ۵ باشد.",
                    "required": "انتخاب امتیاز الزامی است.",
                    "invalid": "امتیاز نامعتبر است.",
                },
            },
            "title": {"required": False, "allow_blank": True},
            "comment": {
                "min_length": 5,
                "max_length": 1000,
                "error_messages": {
                    "blank": "متن نظر نمی‌تواند خالی باشد.",
                    "required": "متن نظر الزامی است.",
                    "min_length": "متن نظر باید حداقل ۵ کاراکتر باشد.",
                    "max_length": "متن نظر نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.",
                },
            },
        }

    def get_user_display(self, obj: ProductReview) -> str:
        return _user_display(obj.user)


class AdminProductReviewSerializer(serializers.ModelSerializer):
    """نمای مدیریتی نظر؛ فقط فیلد status قابل نوشتن است."""

    user_display = serializers.SerializerMethodField()
    product_title = serializers.CharField(source="product.title_fa", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)

    class Meta:
        model = ProductReview
        fields = (
            "id",
            "product",
            "product_title",
            "product_slug",
            "user",
            "user_display",
            "rating",
            "title",
            "comment",
            "status",
            "is_verified_purchase",
            "created_at",
        )
        read_only_fields = (
            "id",
            "product",
            "product_title",
            "product_slug",
            "user",
            "user_display",
            "rating",
            "title",
            "comment",
            "is_verified_purchase",
            "created_at",
        )

    def get_user_display(self, obj: ProductReview) -> str:
        return _user_display(obj.user)
