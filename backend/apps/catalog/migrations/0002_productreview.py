"""افزودن مدل ProductReview (نظر و امتیاز محصول)."""

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductReview",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                (
                    "rating",
                    models.PositiveSmallIntegerField(
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(5),
                        ],
                        verbose_name="امتیاز",
                    ),
                ),
                ("title", models.CharField(blank=True, max_length=120, verbose_name="عنوان")),
                ("comment", models.TextField(verbose_name="متن نظر")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "در انتظار تأیید"),
                            ("APPROVED", "تأییدشده"),
                            ("REJECTED", "ردشده"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=10,
                        verbose_name="وضعیت",
                    ),
                ),
                (
                    "is_verified_purchase",
                    models.BooleanField(default=False, verbose_name="خریدار تأییدشده"),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reviews",
                        to="catalog.product",
                        verbose_name="محصول",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="product_reviews",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="کاربر",
                    ),
                ),
            ],
            options={
                "verbose_name": "نظر محصول",
                "verbose_name_plural": "نظرات محصول",
                "ordering": ("-created_at",),
            },
        ),
        migrations.AddIndex(
            model_name="productreview",
            index=models.Index(
                fields=["product", "status"], name="catalog_review_prod_status_idx"
            ),
        ),
        migrations.AddConstraint(
            model_name="productreview",
            constraint=models.UniqueConstraint(
                fields=["product", "user"], name="uniq_review_per_user_product"
            ),
        ),
    ]
