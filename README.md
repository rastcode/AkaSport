# آکااسپرت (AkaSport)

بازارگاه ورزشی فارسی و کاملاً RTL. بک‌اند **Django 5 + DRF** و فروشگاه **Next.js 14 (App Router) + TypeScript + Tailwind**. احراز هویت **JWT** با نقش‌های `OWNER` / `ADMIN` / `CUSTOMER`.

## ساختار

| پوشه | توضیح |
| --- | --- |
| `backend/` | API جنگو/DRF، احراز هویت تلفن‌محور + OTP هش‌شده، کاتالوگ، سفارش‌ها، چت، آنالیتیکس |
| `storefront/` | فروشگاه Next.js (SSR، RTL فارسی) |

## راه‌اندازی توسعه

### بک‌اند

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # ویندوز: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # سپس SECRET_KEY را پر کنید
python manage.py migrate
python manage.py seed_owner     # ساخت حساب OWNER پیش‌فرض
python manage.py seed_catalog   # داده‌ی نمونه‌ی فارسی
python manage.py runserver
```

### فروشگاه

```bash
cd storefront
npm install
cp .env.local.example .env.local
npm run dev
```

## متغیرهای محیطی کلیدی

### بک‌اند (`backend/.env`)

| متغیر | پیش‌فرض | توضیح |
| --- | --- | --- |
| `DJANGO_DEBUG` | `False` | در production حتماً `False` |
| `DJANGO_SECRET_KEY` | — | در production الزامی؛ اگر `DEBUG=False` و تنظیم نشود، اپ بالا نمی‌آید |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | دامنه‌های مجاز |
| `CORS_ALLOWED_ORIGINS` | localhost:3000 | origin فروشگاه |
| `CSRF_TRUSTED_ORIGINS` | localhost:3000 | origin مورد اعتماد CSRF |
| `DJANGO_SECURE_SSL_REDIRECT` | `True` (prod) | پشت پراکسی TLS در صورت ریدایرکت تکراری `0` |
| `DJANGO_HSTS_SECONDS` | `31536000` | عمر HSTS |
| `CACHE_IN_MEMORY` / `CHANNELS_IN_MEMORY` | `1` | `0` برای استفاده از Redis |

### فروشگاه (`storefront/.env.local`)

| متغیر | توضیح |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | آدرس API بک‌اند |
| `NEXT_PUBLIC_SITE_URL` | دامنه‌ی عمومی سایت (برای SEO: canonical، sitemap، robots، JSON-LD) |
| `NEXT_PUBLIC_MEDIA_HOSTS` | میزبان‌های تصویر production برای `next/image` (با کاما) |

## چک‌لیست production

- [ ] `DJANGO_DEBUG=False` و `DJANGO_SECRET_KEY` قوی و یکتا.
- [ ] `DJANGO_ALLOWED_HOSTS`، `CORS_ALLOWED_ORIGINS`، `CSRF_TRUSTED_ORIGINS` با دامنه‌های واقعی.
- [ ] اجرای `python manage.py check --deploy` و رفع هشدارها.
- [ ] سرو فایل‌های static/media از طریق nginx یا S3/CDN (نه جنگو در production).
- [ ] `NEXT_PUBLIC_SITE_URL` و `NEXT_PUBLIC_MEDIA_HOSTS` با دامنه‌ی واقعی.
- [ ] اجرای موفق `npm run build` در فروشگاه.
- [ ] درگاه واقعی پیامک به‌جای MOCK SMS (در `apps/authentication/services.py`).
- [ ] اطمینان از این‌که هیچ secret واقعی داخل Git نیست؛ `.env` فقط محلی.
- [ ] (در صورت استفاده) Redis برای cache/channels با `CACHE_IN_MEMORY=0`.

## CI

`.github/workflows/ci.yml` در هر push/PR: type-check + build فروشگاه و `manage.py check` بک‌اند را اجرا می‌کند. هیچ secret لازم نیست (مقادیر CI ساختگی و غیرمحرمانه‌اند).
