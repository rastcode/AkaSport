"""
Seed a small, idempotent demo catalog so the storefront isn't empty on first run.

Creates a category tree, a couple of brands, and several published products
(each with variants + specifications). Safe to run multiple times.

Usage:
    python manage.py seed_demo
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.products.models import Brand, Category, Product, ProductVariant


class Command(BaseCommand):
    help = "Create a small demo catalog (idempotent)."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        # --- categories (with dynamic spec schemas) --------------------- #
        clothing, _ = Category.objects.get_or_create(
            slug="clothing",
            defaults={
                "name": "پوشاک ورزشی",
                "dynamic_attributes_schema": {
                    "material": {"type": "string", "label": "جنس", "required": False},
                    "weight": {"type": "string", "label": "وزن", "required": False},
                },
            },
        )
        shoes, _ = Category.objects.get_or_create(
            slug="shoes",
            defaults={
                "name": "کفش ورزشی",
                "dynamic_attributes_schema": {
                    "material": {"type": "string", "label": "جنس", "required": False},
                    "weight": {"type": "string", "label": "وزن", "required": False},
                },
            },
        )
        balls, _ = Category.objects.get_or_create(
            slug="balls",
            defaults={
                "name": "توپ ورزشی",
                "dynamic_attributes_schema": {
                    "size": {"type": "string", "label": "اندازه", "required": False},
                    "weight": {"type": "string", "label": "وزن", "required": False},
                },
            },
        )

        # --- brands ----------------------------------------------------- #
        aka, _ = Brand.objects.get_or_create(
            slug="akasport", defaults={"name": "آکاسپورت"}
        )
        peak, _ = Brand.objects.get_or_create(
            slug="peak", defaults={"name": "پیک"}
        )

        # --- products --------------------------------------------------- #
        catalog = [
            {
                "slug": "running-shoe-pro",
                "title": "کفش دویدن پرو",
                "category": shoes,
                "brand": aka,
                "base_price": "1850000",
                "featured": True,
                "specs": {"material": "مش تنفسی", "weight": "۲۶۰ گرم"},
                "variants": [
                    {"sku": "RUN-PRO-42-BLK", "attrs": {"size": 42, "color": "Black"}, "stock": 12},
                    {"sku": "RUN-PRO-43-BLK", "attrs": {"size": 43, "color": "Black"}, "stock": 7},
                    {"sku": "RUN-PRO-42-BLU", "attrs": {"size": 42, "color": "Blue"}, "stock": 3},
                ],
            },
            {
                "slug": "training-hoodie",
                "title": "هودی تمرین",
                "category": clothing,
                "brand": aka,
                "base_price": "950000",
                "featured": True,
                "specs": {"material": "پنبه‌پلی‌استر", "weight": "۴۸۰ گرم"},
                "variants": [
                    {"sku": "HOOD-M-GRY", "attrs": {"size": "M", "color": "Grey"}, "stock": 20},
                    {"sku": "HOOD-L-GRY", "attrs": {"size": "L", "color": "Grey"}, "stock": 2},
                ],
            },
            {
                "slug": "pro-match-football",
                "title": "توپ فوتبال مسابقه",
                "category": balls,
                "brand": peak,
                "base_price": "720000",
                "featured": True,
                "specs": {"size": "۵", "weight": "۴۲۰ گرم"},
                "variants": [
                    {"sku": "BALL-FB-5-WHT", "attrs": {"color": "White"}, "stock": 30},
                ],
            },
            {
                "slug": "court-basketball",
                "title": "توپ بسکتبال زمین",
                "category": balls,
                "brand": peak,
                "base_price": "880000",
                "featured": False,
                "specs": {"size": "۷", "weight": "۶۰۰ گرم"},
                "variants": [
                    {"sku": "BALL-BB-7-ORG", "attrs": {"color": "Orange"}, "stock": 15},
                ],
            },
            {
                "slug": "performance-tshirt",
                "title": "تیشرت عملکردی",
                "category": clothing,
                "brand": aka,
                "base_price": "430000",
                "featured": False,
                "specs": {"material": "پلی‌استر خنک", "weight": "۱۸۰ گرم"},
                "variants": [
                    {"sku": "TEE-S-RED", "attrs": {"size": "S", "color": "Red"}, "stock": 25},
                    {"sku": "TEE-M-RED", "attrs": {"size": "M", "color": "Red"}, "stock": 18},
                    {"sku": "TEE-M-GRN", "attrs": {"size": "M", "color": "Green"}, "stock": 9},
                ],
            },
            {
                "slug": "trail-runner",
                "title": "کفش کوهستان",
                "category": shoes,
                "brand": peak,
                "base_price": "2150000",
                "featured": True,
                "specs": {"material": "چرم مصنوعی", "weight": "۳۲۰ گرم"},
                "variants": [
                    {"sku": "TRL-41-BRN", "attrs": {"size": 41, "color": "Black"}, "stock": 6},
                    {"sku": "TRL-44-BRN", "attrs": {"size": 44, "color": "Black"}, "stock": 0},
                ],
            },
        ]

        created = 0
        for item in catalog:
            product, was_created = Product.objects.get_or_create(
                slug=item["slug"],
                defaults={
                    "title": item["title"],
                    "category": item["category"],
                    "brand": item["brand"],
                    "base_price": Decimal(item["base_price"]),
                    "status": Product.Status.PUBLISHED,
                    "is_featured": item["featured"],
                    "specifications": item["specs"],
                    "description": f"{item['title']} — محصول نمونه‌ی فروشگاه آکاسپورت.",
                },
            )
            if was_created:
                created += 1
            for v in item["variants"]:
                ProductVariant.objects.get_or_create(
                    sku=v["sku"],
                    defaults={
                        "product": product,
                        "attributes": v["attrs"],
                        "stock_quantity": v["stock"],
                        "price_modifier": Decimal("0.00"),
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo catalog ready: {Product.objects.count()} products "
                f"({created} new), {Category.objects.count()} categories, "
                f"{Brand.objects.count()} brands."
            )
        )
