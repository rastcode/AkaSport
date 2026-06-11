"""افزودن min_order_amount/max_discount_amount و اختیاری‌کردن valid_to برای Coupon."""

import django.core.validators
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="coupon",
            name="valid_to",
            field=models.DateTimeField(blank=True, null=True, verbose_name="valid to"),
        ),
        migrations.AddField(
            model_name="coupon",
            name="min_order_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=0,
                max_digits=12,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
                verbose_name="حداقل مبلغ سفارش",
            ),
        ),
        migrations.AddField(
            model_name="coupon",
            name="max_discount_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=0,
                help_text="فقط برای تخفیف درصدی.",
                max_digits=12,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
                verbose_name="سقف مبلغ تخفیف",
            ),
        ),
    ]
