"""
ساخت دیتای نمونه‌ی فارسیِ «لوازم و پوشاک ورزشی» برای apps.catalog.

این command idempotent است: با هر بار اجرا دیتای تکراری نمی‌سازد (از
get_or_create بر اساس slug / sku / نام استفاده می‌کند). تنها apps.catalog را
پر می‌کند و به هیچ بخش دیگری (به‌ویژه فرانت‌اند) دست نمی‌زند.

اجرا:
    python manage.py seed_catalog
"""

from __future__ import annotations

from typing import Any, Optional

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import (
    Brand,
    Category,
    Color,
    Product,
    ProductVariant,
    Size,
)

_PERSIAN_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(n: int | str) -> str:
    """تبدیل ارقام انگلیسی به فارسی برای خروجی خوانا."""
    return str(n).translate(_PERSIAN_DIGITS)


# --------------------------------------------------------------------------- #
# داده‌ها
# --------------------------------------------------------------------------- #
# هر دسته‌ی اصلی: (slug, name_fa, [ (child_slug, child_name_fa), ... ])
CATEGORIES: list[tuple[str, str, list[tuple[str, str]]]] = [
    (
        "sportswear",
        "پوشاک ورزشی",
        [
            ("mens-sportswear", "مردانه"),
            ("womens-sportswear", "زنانه"),
            ("kids-sportswear", "بچگانه"),
            ("sport-tshirts", "تیشرت ورزشی"),
            ("sport-pants-leggings", "شلوار و لگ ورزشی"),
            ("sweatshirts-hoodies", "سویشرت و هودی ورزشی"),
        ],
    ),
    (
        "sport-shoes",
        "کفش ورزشی",
        [
            ("running-shoes", "کفش دویدن"),
            ("football-shoes", "کفش فوتبال"),
            ("basketball-shoes", "کفش بسکتبال"),
            ("training-shoes", "کفش تمرین و باشگاه"),
            ("hiking-shoes", "کفش کوهنوردی"),
        ],
    ),
    (
        "fitness-equipment",
        "لوازم بدنسازی و فیتنس",
        [
            ("dumbbells-weights", "دمبل و وزنه"),
            ("resistance-bands", "کش ورزشی"),
            ("yoga-mats", "مت یوگا"),
            ("fitness-gloves", "دستکش بدنسازی"),
            ("fitness-belts", "کمربند بدنسازی"),
        ],
    ),
    (
        "ball-sports",
        "ورزش‌های توپی",
        [
            ("football", "فوتبال"),
            ("basketball", "بسکتبال"),
            ("volleyball", "والیبال"),
            ("tennis", "تنیس"),
            ("table-tennis", "پینگ‌پنگ"),
        ],
    ),
    (
        "hiking-camping",
        "کوهنوردی و کمپینگ",
        [
            ("backpacks", "کوله‌پشتی ورزشی"),
            ("water-bottles", "قمقمه و بطری آب"),
            ("tents-camping", "چادر و تجهیزات کمپینگ"),
            ("headlamps", "چراغ پیشانی"),
            ("trekking-poles", "باتوم کوهنوردی"),
        ],
    ),
    (
        "sport-accessories",
        "اکسسوری ورزشی",
        [
            ("sport-watches", "ساعت و مچ‌بند ورزشی"),
            ("sport-bags", "کیف ورزشی"),
            ("sport-socks", "جوراب ورزشی"),
            ("braces-supports", "زانوبند و مچ‌بند"),
            ("sport-towels", "حوله ورزشی"),
        ],
    ),
]

# (slug, name_fa, name_en)
BRANDS: list[tuple[str, str, str]] = [
    ("nike", "نایک", "Nike"),
    ("adidas", "آدیداس", "Adidas"),
    ("puma", "پوما", "Puma"),
    ("reebok", "ریباک", "Reebok"),
    ("under-armour", "آندر آرمور", "Under Armour"),
    ("asics", "اسیکس", "Asics"),
    ("salomon", "سالومون", "Salomon"),
    ("misc", "متفرقه", "Misc"),
]

# (name_fa, hex_code)
COLORS: list[tuple[str, str]] = [
    ("مشکی", "#000000"),
    ("سفید", "#FFFFFF"),
    ("قرمز", "#E5413F"),
    ("آبی", "#1985A1"),
    ("سبز", "#2E7D32"),
    ("طوسی", "#9E9E9E"),
    ("نارنجی", "#FB8C00"),
    ("سرمه‌ای", "#1A237E"),
]

# (value, name_fa, display_order)
SIZES: list[tuple[str, str, int]] = [
    ("XS", "XS", 1),
    ("S", "S", 2),
    ("M", "M", 3),
    ("L", "L", 4),
    ("XL", "XL", 5),
    ("XXL", "XXL", 6),
    ("39", "۳۹", 11),
    ("40", "۴۰", 12),
    ("41", "۴۱", 13),
    ("42", "۴۲", 14),
    ("43", "۴۳", 15),
    ("44", "۴۴", 16),
    ("45", "۴۵", 17),
]

SHOE_SIZES = ["40", "41", "42", "43"]
CLOTHING_SIZES = ["S", "M", "L", "XL"]

# مشخصات فنی نمونه بر اساس نوع کالا
SPEC_SHOE_RUN = {
    "نوع ورزش": "دویدن",
    "جنس رویه": "مش تنفس‌پذیر",
    "جنس زیره": "لاستیک مقاوم",
    "مناسب برای": "تمرین روزانه",
    "وزن": "۲۸۰ گرم",
}
SPEC_CLOTHING = {
    "جنس": "پلی‌استر",
    "قابلیت تنفس": "دارد",
    "مناسب فصل": "چهار فصل",
    "نوع استفاده": "باشگاه و تمرین",
}


def spec_shoe(sport: str, weight: str = "۲۸۰ گرم") -> dict[str, str]:
    return {
        "نوع ورزش": sport,
        "جنس رویه": "مش تنفس‌پذیر",
        "جنس زیره": "لاستیک مقاوم",
        "مناسب برای": "تمرین روزانه",
        "وزن": weight,
    }


def spec_ball(ball_type: str, size: str = "۵") -> dict[str, str]:
    return {
        "نوع توپ": ball_type,
        "سایز": size,
        "جنس": "چرم مصنوعی",
        "مناسب برای": "زمین چمن و سالن",
    }


def spec_fitness(tool: str, weight: str, material: str) -> dict[str, str]:
    return {
        "نوع وسیله": tool,
        "وزن": weight,
        "جنس": material,
        "مناسب برای": "تمرین خانگی",
    }


# تعریف محصولات.
# kind ∈ {shoe, clothing, simple}
# colors: لیست name_fa رنگ‌ها (یا خالی)
PRODUCTS: list[dict[str, Any]] = [
    {
        "slug": "nike-air-zoom-running",
        "title_fa": "کفش دویدن نایک مدل Air Zoom",
        "title_en": "Nike Air Zoom Running Shoes",
        "category": "running-shoes",
        "brand": "nike",
        "base_price": 4500000,
        "discount_price": 3950000,
        "is_featured": True,
        "kind": "shoe",
        "colors": ["مشکی", "آبی"],
        "specifications": spec_shoe("دویدن", "۲۷۰ گرم"),
    },
    {
        "slug": "adidas-predator-football",
        "title_fa": "کفش فوتبال آدیداس مدل Predator",
        "title_en": "Adidas Predator Football Boots",
        "category": "football-shoes",
        "brand": "adidas",
        "base_price": 5200000,
        "is_featured": True,
        "kind": "shoe",
        "colors": ["مشکی", "قرمز"],
        "specifications": spec_shoe("فوتبال", "۲۳۰ گرم"),
    },
    {
        "slug": "salomon-trail-hiking",
        "title_fa": "کفش کوهنوردی سالومون مدل Trail",
        "title_en": "Salomon Trail Hiking Shoes",
        "category": "hiking-shoes",
        "brand": "salomon",
        "base_price": 6800000,
        "discount_price": 5900000,
        "kind": "shoe",
        "colors": ["طوسی", "سبز"],
        "specifications": spec_shoe("کوهنوردی", "۳۴۰ گرم"),
    },
    {
        "slug": "nike-mens-sport-tshirt",
        "title_fa": "تیشرت ورزشی مردانه نایک",
        "title_en": "Nike Men's Sport T-Shirt",
        "category": "sport-tshirts",
        "brand": "nike",
        "base_price": 850000,
        "kind": "clothing",
        "colors": ["مشکی", "سفید"],
        "specifications": SPEC_CLOTHING,
    },
    {
        "slug": "adidas-womens-legging",
        "title_fa": "لگ ورزشی زنانه آدیداس",
        "title_en": "Adidas Women's Sport Legging",
        "category": "sport-pants-leggings",
        "brand": "adidas",
        "base_price": 1200000,
        "discount_price": 990000,
        "kind": "clothing",
        "colors": ["مشکی", "سرمه‌ای"],
        "specifications": {
            "جنس": "پلی‌استر و الاستان",
            "قابلیت تنفس": "دارد",
            "کشسانی": "بالا",
            "نوع استفاده": "یوگا و تمرین",
        },
    },
    {
        "slug": "puma-sport-hoodie",
        "title_fa": "هودی ورزشی پوما",
        "title_en": "Puma Sport Hoodie",
        "category": "sweatshirts-hoodies",
        "brand": "puma",
        "base_price": 1850000,
        "is_featured": True,
        "kind": "clothing",
        "colors": ["طوسی", "مشکی"],
        "specifications": {
            "جنس": "پنبه و پلی‌استر",
            "نوع یقه": "کلاه‌دار",
            "مناسب فصل": "پاییز و زمستان",
            "نوع استفاده": "روزمره و ورزشی",
        },
    },
    {
        "slug": "reebok-mens-sport-pants",
        "title_fa": "شلوار ورزشی مردانه ریباک",
        "title_en": "Reebok Men's Sport Pants",
        "category": "sport-pants-leggings",
        "brand": "reebok",
        "base_price": 1450000,
        "kind": "clothing",
        "colors": ["مشکی", "سرمه‌ای"],
        "specifications": SPEC_CLOTHING,
    },
    {
        "slug": "adidas-football-ball",
        "title_fa": "توپ فوتبال آدیداس",
        "title_en": "Adidas Football",
        "category": "football",
        "brand": "adidas",
        "base_price": 980000,
        "discount_price": 820000,
        "kind": "simple",
        "colors": ["سفید"],
        "specifications": spec_ball("فوتبال", "۵"),
    },
    {
        "slug": "basketball-ball-standard",
        "title_fa": "توپ بسکتبال سایز ۷",
        "title_en": "Basketball Size 7",
        "category": "basketball",
        "brand": "misc",
        "base_price": 750000,
        "kind": "simple",
        "colors": ["نارنجی"],
        "specifications": spec_ball("بسکتبال", "۷"),
    },
    {
        "slug": "tennis-racket-pro",
        "title_fa": "راکت تنیس حرفه‌ای",
        "title_en": "Professional Tennis Racket",
        "category": "tennis",
        "brand": "misc",
        "base_price": 2300000,
        "kind": "simple",
        "colors": [],
        "specifications": {
            "وزن": "۳۰۰ گرم",
            "جنس": "گرافیت",
            "سایز دسته": "L۳",
            "مناسب برای": "بازیکن متوسط تا حرفه‌ای",
        },
    },
    {
        "slug": "home-dumbbell-5kg",
        "title_fa": "دمبل خانگی ۵ کیلوگرمی",
        "title_en": "Home Dumbbell 5kg",
        "category": "dumbbells-weights",
        "brand": "misc",
        "base_price": 650000,
        "kind": "simple",
        "colors": ["مشکی"],
        "specifications": spec_fitness("دمبل", "۵ کیلوگرم", "چدن با روکش لاستیکی"),
    },
    {
        "slug": "resistance-band-set",
        "title_fa": "کش تمرین مقاومتی",
        "title_en": "Resistance Training Band",
        "category": "resistance-bands",
        "brand": "misc",
        "base_price": 320000,
        "discount_price": 270000,
        "kind": "simple",
        "colors": ["قرمز", "آبی"],
        "specifications": spec_fitness("کش مقاومتی", "—", "لاتکس طبیعی"),
    },
    {
        "slug": "yoga-mat-pro",
        "title_fa": "مت یوگا حرفه‌ای",
        "title_en": "Professional Yoga Mat",
        "category": "yoga-mats",
        "brand": "misc",
        "base_price": 890000,
        "is_featured": True,
        "kind": "simple",
        "colors": ["سبز", "آبی"],
        "specifications": {
            "ضخامت": "۶ میلی‌متر",
            "جنس": "TPE ضدلغزش",
            "ابعاد": "۱۸۳×۶۱ سانتی‌متر",
            "مناسب برای": "یوگا و پیلاتس",
        },
    },
    {
        "slug": "fitness-gloves-pro",
        "title_fa": "دستکش بدنسازی",
        "title_en": "Fitness Gloves",
        "category": "fitness-gloves",
        "brand": "under-armour",
        "base_price": 540000,
        "kind": "clothing",
        "colors": ["مشکی"],
        "sizes": ["S", "M", "L"],
        "specifications": {
            "جنس": "چرم مصنوعی و مش",
            "قابلیت شست‌وشو": "دارد",
            "مناسب برای": "وزنه و بدنسازی",
        },
    },
    {
        "slug": "fitness-belt-pro",
        "title_fa": "کمربند بدنسازی",
        "title_en": "Weightlifting Belt",
        "category": "fitness-belts",
        "brand": "under-armour",
        "base_price": 720000,
        "kind": "clothing",
        "colors": ["مشکی"],
        "sizes": ["M", "L", "XL"],
        "specifications": {
            "جنس": "چرم طبیعی",
            "پهنا": "۱۰ سانتی‌متر",
            "مناسب برای": "اسکات و ددلیفت",
        },
    },
    {
        "slug": "salomon-hiking-backpack",
        "title_fa": "کوله‌پشتی کوهنوردی سالومون",
        "title_en": "Salomon Hiking Backpack",
        "category": "backpacks",
        "brand": "salomon",
        "base_price": 2950000,
        "discount_price": 2490000,
        "kind": "simple",
        "colors": ["مشکی", "سبز"],
        "specifications": {
            "حجم": "۳۵ لیتر",
            "جنس": "نایلون ضدآب",
            "تعداد جیب": "۵",
            "مناسب برای": "کوهنوردی و طبیعت‌گردی",
        },
    },
    {
        "slug": "sport-water-bottle",
        "title_fa": "قمقمه ورزشی",
        "title_en": "Sport Water Bottle",
        "category": "water-bottles",
        "brand": "misc",
        "base_price": 280000,
        "kind": "simple",
        "colors": ["آبی", "مشکی", "قرمز"],
        "specifications": {
            "حجم": "۷۵۰ میلی‌لیتر",
            "جنس": "پلاستیک بدون BPA",
            "قابلیت نشکن": "دارد",
        },
    },
    {
        "slug": "sport-smartwatch",
        "title_fa": "ساعت ورزشی هوشمند",
        "title_en": "Sport Smart Watch",
        "category": "sport-watches",
        "brand": "misc",
        "base_price": 3800000,
        "discount_price": 3290000,
        "is_featured": True,
        "kind": "simple",
        "colors": ["مشکی"],
        "specifications": {
            "ضدآب": "دارد",
            "سنسور ضربان قلب": "دارد",
            "عمر باتری": "۷ روز",
            "مناسب برای": "دویدن و تمرین",
        },
    },
    {
        "slug": "knee-support-brace",
        "title_fa": "زانوبند ورزشی",
        "title_en": "Sport Knee Support",
        "category": "braces-supports",
        "brand": "asics",
        "base_price": 460000,
        "kind": "clothing",
        "colors": ["مشکی"],
        "sizes": ["S", "M", "L"],
        "specifications": {
            "جنس": "نئوپرن",
            "قابلیت تنظیم": "دارد",
            "مناسب برای": "حمایت از مفصل زانو",
        },
    },
    {
        "slug": "puma-gym-bag",
        "title_fa": "کیف ورزشی باشگاه پوما",
        "title_en": "Puma Gym Bag",
        "category": "sport-bags",
        "brand": "puma",
        "base_price": 1150000,
        "discount_price": 950000,
        "kind": "simple",
        "colors": ["مشکی", "سرمه‌ای"],
        "specifications": {
            "حجم": "۳۰ لیتر",
            "جنس": "پلی‌استر ضدآب",
            "جیب کفش": "دارد",
            "مناسب برای": "باشگاه و سفر",
        },
    },
]

# الگوی موجودی برای تنوع‌ها (شامل مقادیر کم برای تست هشدار موجودی).
STOCK_CYCLE = [25, 12, 3, 40, 8, 2, 30, 15]


class Command(BaseCommand):
    help = "ساخت دیتای نمونه‌ی ورزشی فارسی برای کاتالوگ (idempotent)."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        cat_by_slug = self._seed_categories()
        brand_by_slug = self._seed_brands()
        color_by_name = self._seed_colors()
        size_by_value = self._seed_sizes()
        variant_count = self._seed_products(
            cat_by_slug, brand_by_slug, color_by_name, size_by_value
        )

        self._print_summary(variant_count)

    # ------------------------------------------------------------------ #
    def _seed_categories(self) -> dict[str, Category]:
        result: dict[str, Category] = {}
        order = 0
        for main_slug, main_name, children in CATEGORIES:
            order += 1
            main, _ = Category.objects.get_or_create(
                slug=main_slug,
                defaults={
                    "name_fa": main_name,
                    "parent": None,
                    "is_active": True,
                    "display_order": order,
                },
            )
            result[main_slug] = main
            child_order = 0
            for child_slug, child_name in children:
                child_order += 1
                child, _ = Category.objects.get_or_create(
                    slug=child_slug,
                    defaults={
                        "name_fa": child_name,
                        "parent": main,
                        "is_active": True,
                        "display_order": child_order,
                    },
                )
                result[child_slug] = child
        return result

    def _seed_brands(self) -> dict[str, Brand]:
        result: dict[str, Brand] = {}
        for slug, name_fa, name_en in BRANDS:
            brand, _ = Brand.objects.get_or_create(
                slug=slug,
                defaults={"name_fa": name_fa, "name_en": name_en, "is_active": True},
            )
            result[slug] = brand
        return result

    def _seed_colors(self) -> dict[str, Color]:
        result: dict[str, Color] = {}
        for name_fa, hex_code in COLORS:
            color, _ = Color.objects.get_or_create(
                name_fa=name_fa,
                defaults={"hex_code": hex_code, "is_active": True},
            )
            result[name_fa] = color
        return result

    def _seed_sizes(self) -> dict[str, Size]:
        result: dict[str, Size] = {}
        for value, name_fa, order in SIZES:
            size, _ = Size.objects.get_or_create(
                value=value,
                defaults={"name_fa": name_fa, "display_order": order},
            )
            result[value] = size
        return result

    # ------------------------------------------------------------------ #
    def _seed_products(
        self,
        cat_by_slug: dict[str, Category],
        brand_by_slug: dict[str, Brand],
        color_by_name: dict[str, Color],
        size_by_value: dict[str, Size],
    ) -> int:
        variant_total = 0
        stock_idx = 0

        for spec in PRODUCTS:
            category = cat_by_slug.get(spec["category"])
            brand = brand_by_slug.get(spec["brand"])
            if category is None:
                continue

            product, _ = Product.objects.get_or_create(
                slug=spec["slug"],
                defaults={
                    "title_fa": spec["title_fa"],
                    "title_en": spec.get("title_en", ""),
                    "short_description_fa": self._short_desc(spec["title_fa"]),
                    "description_fa": self._long_desc(spec["title_fa"]),
                    "category": category,
                    "brand": brand,
                    "base_price": spec["base_price"],
                    "discount_price": spec.get("discount_price"),
                    "status": Product.Status.PUBLISHED,
                    "specifications": spec.get("specifications", {}),
                    "seo_title": f"{spec['title_fa']} | خرید با بهترین قیمت | آکامارکت",
                    "seo_description": self._short_desc(spec["title_fa"]),
                    "view_count": spec["base_price"] % 500,  # عددی پایدار و متنوع
                    "sold_count": (spec["base_price"] // 100000) % 120,
                    "is_featured": spec.get("is_featured", False),
                },
            )

            variant_total += self._seed_variants(
                product, spec, color_by_name, size_by_value, stock_idx
            )
            stock_idx += 1

        return variant_total

    def _seed_variants(
        self,
        product: Product,
        spec: dict[str, Any],
        color_by_name: dict[str, Color],
        size_by_value: dict[str, Size],
        stock_idx: int,
    ) -> int:
        kind = spec["kind"]
        colors = [color_by_name[c] for c in spec.get("colors", []) if c in color_by_name]
        base_price = spec["base_price"]
        discount_price = spec.get("discount_price")

        combos: list[tuple[Optional[Color], Optional[Size], str]] = []

        if kind == "shoe":
            sizes = [size_by_value[s] for s in SHOE_SIZES if s in size_by_value]
            chosen_colors = colors or [None]
            for ci, color in enumerate(chosen_colors):
                for size in sizes:
                    suffix = f"{size.value}-{ci}"
                    combos.append((color, size, suffix))
        elif kind == "clothing":
            size_values = spec.get("sizes", CLOTHING_SIZES)
            sizes = [size_by_value[s] for s in size_values if s in size_by_value]
            chosen_colors = colors or [None]
            for ci, color in enumerate(chosen_colors):
                for size in sizes:
                    suffix = f"{size.value}-{ci}"
                    combos.append((color, size, suffix))
        else:  # simple
            chosen_colors = colors or [None]
            for ci, color in enumerate(chosen_colors):
                combos.append((color, None, f"std-{ci}" if color else "std"))

        created = 0
        for i, (color, size, suffix) in enumerate(combos):
            sku = f"{product.slug}-{suffix}".upper()
            stock = STOCK_CYCLE[(stock_idx + i) % len(STOCK_CYCLE)]
            _, was_created = ProductVariant.objects.get_or_create(
                sku=sku,
                defaults={
                    "product": product,
                    "color": color,
                    "size": size,
                    "price": base_price,
                    "discount_price": discount_price,
                    "stock_quantity": stock,
                    "is_active": True,
                },
            )
            created += 1 if was_created else 0
        # تعداد کل تنوع‌های این محصول (نه فقط تازه‌ساخته‌ها) برای خلاصه‌ی دقیق.
        return len(combos)

    # ------------------------------------------------------------------ #
    @staticmethod
    def _short_desc(title: str) -> str:
        return f"{title} با کیفیت بالا، مناسب تمرین و استفاده‌ی روزمره."

    @staticmethod
    def _long_desc(title: str) -> str:
        return (
            f"{title} یکی از محصولات منتخب فروشگاه ورزشی آکامارکت است. "
            "این محصول با تمرکز بر دوام، راحتی و عملکرد ورزشی طراحی شده و برای "
            "ورزشکاران در سطوح مختلف مناسب است. کیفیت ساخت و متریال به‌کاررفته، "
            "تجربه‌ای مطمئن در تمرین و مسابقه فراهم می‌کند."
        )

    def _print_summary(self, variant_count: int) -> None:
        self.stdout.write(
            self.style.SUCCESS("دیتای نمونه کاتالوگ ورزشی با موفقیت ساخته شد.")
        )
        self.stdout.write(f"تعداد دسته‌بندی‌ها: {fa(Category.objects.count())}")
        self.stdout.write(f"تعداد برندها: {fa(Brand.objects.count())}")
        self.stdout.write(f"تعداد رنگ‌ها: {fa(Color.objects.count())}")
        self.stdout.write(f"تعداد سایزها: {fa(Size.objects.count())}")
        self.stdout.write(f"تعداد محصولات: {fa(Product.objects.count())}")
        self.stdout.write(f"تعداد تنوع‌ها: {fa(ProductVariant.objects.count())}")
