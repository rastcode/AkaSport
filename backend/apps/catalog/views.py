"""
Catalog API views.

Public read viewsets expose only published products / active lookups, are
N+1-safe (select_related + prefetch_related), paginated, and annotate the
fields the filter/ordering layer needs. Admin viewsets provide full CRUD gated
by `IsAdminOrOwner`.
"""

from __future__ import annotations

from typing import Type

from django.db.models import (
    Avg,
    Case,
    Count,
    Exists,
    F,
    FloatField,
    OuterRef,
    Prefetch,
    Q,
    QuerySet,
    Value,
    When,
)
from django.db.models.functions import Cast, Coalesce
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.views import APIView

from apps.authentication.permissions import IsAdmin
from apps.catalog.filters import ProductFilter
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
from apps.catalog.serializers import (
    AdminProductReviewSerializer,
    AdminProductVariantWriteSerializer,
    AdminProductWriteSerializer,
    BrandSerializer,
    CategoryListSerializer,
    CategoryTreeSerializer,
    ColorSerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
    ProductListSerializer,
    ProductReviewSerializer,
    ProductVariantSerializer,
    SizeSerializer,
)


# --------------------------------------------------------------------------- #
# Permissions
# --------------------------------------------------------------------------- #
class IsAdminOrOwner(IsAdmin):
    """Write access for ADMIN or OWNER roles only (CUSTOMER/anon denied)."""

    message = "فقط مدیر یا مالک می‌تواند کاتالوگ را ویرایش کند."


# --------------------------------------------------------------------------- #
# Product querysets
# --------------------------------------------------------------------------- #
def product_list_queryset() -> QuerySet[Product]:
    """Product queryset annotated for price range, discount sort and stock."""
    effective = Coalesce("discount_price", "base_price")
    base_f = Cast("base_price", FloatField())
    eff_f = Cast(effective, FloatField())

    has_stock = ProductVariant.objects.filter(
        product=OuterRef("pk"), is_active=True, stock_quantity__gt=0
    )

    return (
        Product.objects.select_related("category", "brand")
        .prefetch_related("images")
        .annotate(
            eff_price=effective,
            in_stock=Exists(has_stock),
            disc_ratio=Case(
                When(base_price=0, then=Value(0.0)),
                default=(base_f - eff_f) / base_f * Value(100.0),
                output_field=FloatField(),
            ),
        )
    )


def product_detail_queryset(*, include_inactive_variants: bool = False) -> QuerySet[Product]:
    """Product detail queryset with nested relations and review aggregates."""
    variants = ProductVariant.objects.select_related("color", "size").prefetch_related(
        "images"
    )
    if not include_inactive_variants:
        variants = variants.filter(is_active=True)

    return (
        product_list_queryset()
        .select_related(
            "category__parent",
            "category__parent__parent",
            "category__parent__parent__parent",
            "category__parent__parent__parent__parent",
        )
        .prefetch_related(Prefetch("variants", queryset=variants))
        .annotate(
            approved_reviews_count=Count(
                "reviews",
                filter=Q(reviews__status=ProductReview.Status.APPROVED),
                distinct=True,
            ),
            approved_average_rating=Avg(
                "reviews__rating",
                filter=Q(reviews__status=ProductReview.Status.APPROVED),
            ),
        )
    )


# --------------------------------------------------------------------------- #
# Public lookups
# --------------------------------------------------------------------------- #
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """`/categories/` (+ `/categories/tree/`) — active categories."""

    serializer_class = CategoryListSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Category]:
        return Category.objects.filter(is_active=True).select_related(
            "parent",
            "parent__parent",
            "parent__parent__parent",
            "parent__parent__parent__parent",
        ).order_by(
            "display_order",
            "name_fa",
        )

    @action(detail=False, methods=["get"])
    def tree(self, request: Request) -> Response:
        categories = list(
            Category.objects.filter(is_active=True).order_by(
                "display_order", "name_fa"
            )
        )
        children_by_parent: dict[int | None, list[Category]] = {}
        for category in categories:
            children_by_parent.setdefault(category.parent_id, []).append(category)
        for category in categories:
            category.active_children = children_by_parent.get(category.id, [])
        roots = children_by_parent.get(None, [])
        data = CategoryTreeSerializer(
            roots, many=True, context=self.get_serializer_context()
        ).data
        return Response(data)


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Brand]:
        return Brand.objects.filter(is_active=True).order_by("name_fa")


class ColorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ColorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self) -> QuerySet[Color]:
        return Color.objects.filter(is_active=True).order_by("name_fa")


class SizeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SizeSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self) -> QuerySet[Size]:
        return Size.objects.all().order_by("display_order", "value")


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    `/products/` list + `/products/{slug}/` detail.

    Public users see only PUBLISHED products. Faceted filtering, search and the
    six orderings are applied via `ProductFilter` + DRF `SearchFilter`.
    """

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter]
    search_fields = (
        "title_fa",
        "title_en",
        "brand__name_fa",
        "brand__name_en",
        "category__name_fa",
        "category__name_en",
    )

    def get_queryset(self) -> QuerySet[Product]:
        qs = (
            product_list_queryset()
            if self.action == "list"
            else product_detail_queryset()
        )
        if not self._is_staff():
            qs = qs.filter(status=Product.Status.PUBLISHED)
        return qs.order_by("-created_at")

    def get_serializer_class(self) -> Type[BaseSerializer]:
        if self.action == "list":
            return ProductListSerializer
        return ProductDetailSerializer

    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        # Safe, race-free view counter (DB-level F() increment).
        Product.objects.filter(pk=instance.pk).update(
            view_count=F("view_count") + 1
        )
        instance.view_count += 1  # reflect in the response without a re-query
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def _is_staff(self) -> bool:
        user = self.request.user
        return bool(
            user and user.is_authenticated and getattr(user, "is_admin", False)
        )

    def get_serializer_context(self):
        """برای کاربر لاگین‌شده، شناسه‌های علاقه‌مندی را یک‌جا تزریق می‌کنیم تا
        `is_wishlisted` بدون N+1 محاسبه شود."""
        ctx = super().get_serializer_context()
        user = self.request.user
        if user and user.is_authenticated:
            ctx["wishlisted_ids"] = set(
                WishlistItem.objects.filter(user=user).values_list(
                    "product_id", flat=True
                )
            )
        return ctx


# --------------------------------------------------------------------------- #
# Search autocomplete (public)
# --------------------------------------------------------------------------- #
class SearchSuggestionsView(APIView):
    """
    `/search/suggestions/?q=...`

    پیشنهادهای سبک برای autocomplete سربرگ: محصولات منتشرشده، دسته‌بندی‌ها و
    برندهای فعال (هرکدام حداکثر ۵ مورد). اگر q کمتر از ۲ کاراکتر باشد، خالی.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request: Request) -> Response:
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"products": [], "categories": [], "brands": []})

        products = (
            product_list_queryset()
            .filter(status=Product.Status.PUBLISHED)
            .filter(
                Q(title_fa__icontains=q)
                | Q(title_en__icontains=q)
                | Q(slug__icontains=q)
                | Q(brand__name_fa__icontains=q)
                | Q(brand__name_en__icontains=q)
                | Q(category__name_fa__icontains=q)
            )
            [:5]
        )
        categories = (
            Category.objects.filter(is_active=True)
            .select_related(
                "parent",
                "parent__parent",
                "parent__parent__parent",
                "parent__parent__parent__parent",
            )
            .filter(
                Q(name_fa__icontains=q) | Q(name_en__icontains=q) | Q(slug__icontains=q)
            )
            .order_by("display_order", "name_fa")[:5]
        )
        brands = Brand.objects.filter(is_active=True).filter(
            Q(name_fa__icontains=q) | Q(name_en__icontains=q) | Q(slug__icontains=q)
        )[:5]

        ctx = {"request": request}
        if request.user and request.user.is_authenticated:
            ctx["wishlisted_ids"] = set(
                WishlistItem.objects.filter(user=request.user).values_list(
                    "product_id", flat=True
                )
            )
        return Response(
            {
                "products": ProductListSerializer(products, many=True, context=ctx).data,
                "categories": CategoryListSerializer(
                    categories, many=True, context=ctx
                ).data,
                "brands": BrandSerializer(brands, many=True, context=ctx).data,
            }
        )


# --------------------------------------------------------------------------- #
# Admin CRUD viewsets (ADMIN / OWNER only)
# --------------------------------------------------------------------------- #
class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("display_order", "name_fa")
    serializer_class = CategoryListSerializer
    permission_classes = [IsAdminOrOwner]
    lookup_field = "slug"


class AdminBrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by("name_fa")
    serializer_class = BrandSerializer
    permission_classes = [IsAdminOrOwner]
    lookup_field = "slug"


class AdminColorViewSet(viewsets.ModelViewSet):
    queryset = Color.objects.all().order_by("name_fa")
    serializer_class = ColorSerializer
    permission_classes = [IsAdminOrOwner]


class AdminSizeViewSet(viewsets.ModelViewSet):
    queryset = Size.objects.all().order_by("display_order", "value")
    serializer_class = SizeSerializer
    permission_classes = [IsAdminOrOwner]


class AdminProductViewSet(viewsets.ModelViewSet):
    """Full product CRUD with atomic nested-variant management."""

    permission_classes = [IsAdminOrOwner]
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Product]:
        return product_detail_queryset(include_inactive_variants=True).order_by(
            "-created_at"
        )

    def get_serializer_class(self) -> Type[BaseSerializer]:
        if self.action in {"list", "retrieve"}:
            return ProductDetailSerializer
        return AdminProductWriteSerializer


class AdminProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related(
        "product", "color", "size"
    ).all()
    permission_classes = [IsAdminOrOwner]

    def get_serializer_class(self) -> Type[BaseSerializer]:
        if self.action in {"list", "retrieve"}:
            return ProductVariantSerializer
        return AdminProductVariantWriteSerializer


# --------------------------------------------------------------------------- #
# Product reviews
# --------------------------------------------------------------------------- #
def _user_purchased(user, product: Product) -> bool:
    """آیا کاربر این محصول را در سفارشی غیرِ در‌انتظار/لغوشده خریده است؟"""
    try:
        from apps.orders.models import Order, OrderItem
    except Exception:  # pragma: no cover - گارد دفاعی
        return False
    excluded = {Order.Status.PENDING, Order.Status.CANCELED}
    return OrderItem.objects.filter(
        order__user=user, product_variant__product=product
    ).exclude(order__status__in=excluded).exists()


class ProductReviewListCreateView(generics.ListCreateAPIView):
    """
    `/products/<slug>/reviews/`

    GET  : فهرست نظرهای تأییدشده‌ی محصول (عمومی).
    POST : ثبت نظر توسط کاربر لاگین‌شده (status=PENDING). هر کاربر فقط یک نظر.
    """

    serializer_class = ProductReviewSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def _get_product(self) -> Product:
        return get_object_or_404(Product, slug=self.kwargs["slug"])

    def get_queryset(self):
        return (
            ProductReview.objects.filter(
                product=self._get_product(),
                status=ProductReview.Status.APPROVED,
            )
            .select_related("user")
            .order_by("-created_at")
        )

    def perform_create(self, serializer: BaseSerializer) -> None:
        product = self._get_product()
        user = self.request.user
        if ProductReview.objects.filter(product=product, user=user).exists():
            raise ValidationError(
                {"detail": "شما قبلاً برای این محصول نظر ثبت کرده‌اید."}
            )
        serializer.save(
            product=product,
            user=user,
            status=ProductReview.Status.PENDING,
            is_verified_purchase=_user_purchased(user, product),
        )


class AdminProductReviewViewSet(viewsets.ModelViewSet):
    """مدیریت نظرات (فقط ADMIN/OWNER): فهرست، تغییر وضعیت، حذف."""

    serializer_class = AdminProductReviewSerializer
    permission_classes = [IsAdminOrOwner]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = ProductReview.objects.select_related("product", "user").order_by(
            "-created_at"
        )
        params = self.request.query_params
        status_param = params.get("status")
        if status_param:
            qs = qs.filter(status=status_param.upper())
        product_param = params.get("product")
        if product_param:
            qs = qs.filter(product__slug=product_param)
        search = params.get("search")
        if search:
            from django.db.models import Q

            qs = qs.filter(
                Q(comment__icontains=search)
                | Q(title__icontains=search)
                | Q(product__title_fa__icontains=search)
            )
        return qs


# --------------------------------------------------------------------------- #
# Wishlist
# --------------------------------------------------------------------------- #
def _resolve_wishlist_product(data) -> Product:
    """محصول را از روی `product` (id) یا `product_slug` پیدا می‌کند."""
    pid = data.get("product")
    slug = data.get("product_slug")
    if pid:
        return get_object_or_404(Product, pk=pid)
    if slug:
        return get_object_or_404(Product, slug=slug)
    raise ValidationError({"product": "شناسه یا اسلاگ محصول الزامی است."})


class WishlistListView(generics.ListAPIView):
    """فهرست محصولاتِ علاقه‌مندیِ کاربر لاگین‌شده (به‌صورت کارت محصول)."""

    serializer_class = ProductListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _wishlisted_ids(self) -> set[int]:
        if not hasattr(self, "_cached_wishlisted_ids"):
            self._cached_wishlisted_ids = set(
                WishlistItem.objects.filter(user=self.request.user).values_list(
                    "product_id", flat=True
                )
            )
        return self._cached_wishlisted_ids

    def get_queryset(self) -> QuerySet[Product]:
        return product_list_queryset().filter(
            id__in=self._wishlisted_ids()
        ).order_by("-created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["wishlisted_ids"] = self._wishlisted_ids()
        return ctx


class WishlistToggleView(APIView):
    """افزودن/حذف محصول از علاقه‌مندی‌ها (toggle)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request) -> Response:
        product = _resolve_wishlist_product(request.data)
        item, created = WishlistItem.objects.get_or_create(
            user=request.user, product=product
        )
        if not created:
            item.delete()
            return Response({"is_wishlisted": False}, status=status.HTTP_200_OK)
        return Response({"is_wishlisted": True}, status=status.HTTP_201_CREATED)


class WishlistRemoveView(APIView):
    """حذف یک محصول از علاقه‌مندی‌ها با اسلاگ."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request: Request, slug: str) -> Response:
        product = get_object_or_404(Product, slug=slug)
        WishlistItem.objects.filter(user=request.user, product=product).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminProductImageViewSet(viewsets.ModelViewSet):
    """
    CRUD تصاویر محصول (فقط ADMIN/OWNER) با مدیریت «تصویر اصلی» تک‌تصویری:

      * نخستین تصویرِ هر محصول خودکار اصلی می‌شود.
      * اگر تصویری با is_primary=true ثبت/ویرایش شود، بقیه‌ی تصاویر همان محصول
        غیر‌اصلی می‌شوند.
      * با حذف تصویرِ اصلی، در صورت وجود تصویر دیگر، یکی (کمترین display_order،
        سپس قدیمی‌ترین) خودکار اصلی می‌شود.
    """

    queryset = ProductImage.objects.select_related("product", "variant").all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminOrOwner]

    def perform_create(self, serializer: BaseSerializer) -> None:
        image = serializer.save()
        product_id = image.product_id
        # نخستین تصویر محصول → خودکار اصلی.
        is_first = (
            not ProductImage.objects.filter(product_id=product_id)
            .exclude(pk=image.pk)
            .exists()
        )
        if is_first and not image.is_primary:
            image.is_primary = True
            image.save(update_fields=["is_primary"])
        self._enforce_single_primary(image)

    def perform_update(self, serializer: BaseSerializer) -> None:
        image = serializer.save()
        self._enforce_single_primary(image)

    def perform_destroy(self, instance: ProductImage) -> None:
        product_id = instance.product_id
        was_primary = instance.is_primary
        instance.delete()
        if was_primary:
            replacement = (
                ProductImage.objects.filter(product_id=product_id)
                .order_by("display_order", "id")
                .first()
            )
            if replacement is not None and not replacement.is_primary:
                replacement.is_primary = True
                replacement.save(update_fields=["is_primary"])

    @staticmethod
    def _enforce_single_primary(image: ProductImage) -> None:
        if image.is_primary:
            ProductImage.objects.filter(
                product_id=image.product_id, is_primary=True
            ).exclude(pk=image.pk).update(is_primary=False)
