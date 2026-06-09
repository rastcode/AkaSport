"""
Pricing & shipping calculation — Strategy Pattern.

Pricing logic is decoupled from models and views so it can evolve (new
campaigns, role-based discounts, regional shipping) without touching the
checkout flow. A `PricingStrategy` consumes a list of `LineSpec`s (plus an
optional coupon) and returns an immutable `PriceBreakdown`.

Concrete strategies:
    * StandardPricingStrategy - coupon discounts + weight/quantity shipping.
    * VIPDiscountStrategy      - standard logic plus an extra promo discount.

Select a strategy with `get_pricing_strategy(name=..., user=...)`.
"""

from __future__ import annotations

import abc
import re
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Iterable, Optional

from django.conf import settings

from apps.orders.models import Coupon

TWO_PLACES = Decimal("0.01")
ZERO = Decimal("0.00")


def _money(value: Any) -> Decimal:
    """Coerce to a 2-dp Decimal using banker-free half-up rounding."""
    return Decimal(str(value)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------- #
# Value objects
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class LineSpec:
    """
    Normalised checkout line consumed by a strategy.

    `unit_price` is the variant's effective price; `unit_weight_g` is the
    per-unit shipping weight in grams (resolved by the caller).
    """

    sku: str
    title: str
    quantity: int
    unit_price: Decimal
    unit_weight_g: int = 0
    variant_id: Optional[int] = None

    @property
    def line_total(self) -> Decimal:
        return _money(self.unit_price * self.quantity)

    @property
    def line_weight_g(self) -> int:
        return self.unit_weight_g * self.quantity


@dataclass(frozen=True)
class PriceBreakdown:
    """Immutable result of a pricing calculation."""

    subtotal: Decimal
    discount_amount: Decimal
    shipping_cost: Decimal
    total_amount: Decimal
    total_weight_g: int
    strategy: str
    coupon_code: Optional[str] = None
    notes: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> dict[str, Any]:
        return {
            "subtotal": str(self.subtotal),
            "discount_amount": str(self.discount_amount),
            "shipping_cost": str(self.shipping_cost),
            "total_amount": str(self.total_amount),
            "total_weight_g": self.total_weight_g,
            "strategy": self.strategy,
            "coupon_code": self.coupon_code,
            "notes": list(self.notes),
        }


# --------------------------------------------------------------------------- #
# Weight resolution helper
# --------------------------------------------------------------------------- #
_WEIGHT_RE = re.compile(r"(?P<num>\d+(?:\.\d+)?)\s*(?P<unit>kg|g)?", re.IGNORECASE)


def resolve_unit_weight_g(variant: Any) -> int:
    """
    Best-effort per-unit shipping weight (grams) for a variant.

    Resolution order:
        1. Numeric `weight` / `weight_g` in the variant's `attributes` JSON.
        2. A parseable `weight` in the parent product's `specifications`
           (e.g. "300g", "1.2kg").
        3. The configured default (`SHIPPING_DEFAULT_ITEM_WEIGHT_G`).
    """
    default = int(getattr(settings, "SHIPPING_DEFAULT_ITEM_WEIGHT_G", 500))

    attrs = getattr(variant, "attributes", None) or {}
    for key in ("weight_g", "weight"):
        raw = attrs.get(key)
        grams = _to_grams(raw)
        if grams is not None:
            return grams

    product = getattr(variant, "product", None)
    specs = getattr(product, "specifications", None) or {}
    grams = _to_grams(specs.get("weight"))
    if grams is not None:
        return grams

    return default


def _to_grams(raw: Any) -> Optional[int]:
    """Parse a weight value into grams; return None if unparseable."""
    if raw is None:
        return None
    if isinstance(raw, bool):  # guard: bool is a subclass of int
        return None
    if isinstance(raw, (int, float)):
        # Bare number is interpreted as grams.
        return int(raw)
    if isinstance(raw, str):
        match = _WEIGHT_RE.search(raw.strip())
        if not match:
            return None
        num = float(match.group("num"))
        unit = (match.group("unit") or "g").lower()
        return int(num * 1000) if unit == "kg" else int(num)
    return None


# --------------------------------------------------------------------------- #
# Strategy base class
# --------------------------------------------------------------------------- #
class PricingStrategy(abc.ABC):
    """Abstract base for all pricing strategies."""

    #: Stable identifier persisted on the Order and used by the selector.
    name: str = "base"

    def __init__(self, *, user: Any = None) -> None:
        self.user = user

    # -- public API ----------------------------------------------------- #
    def calculate(
        self,
        lines: Iterable[LineSpec],
        coupon: Optional[Coupon] = None,
    ) -> PriceBreakdown:
        """Template method: subtotal -> discount -> shipping -> total."""
        lines = list(lines)
        notes: list[str] = []

        subtotal = _money(sum((ln.line_total for ln in lines), ZERO))
        total_weight_g = sum(ln.line_weight_g for ln in lines)

        discount = self.compute_discount(subtotal, coupon, notes)
        discount = min(discount, subtotal)  # never discount below zero
        discounted_subtotal = _money(subtotal - discount)

        shipping = self.compute_shipping(discounted_subtotal, total_weight_g, notes)
        total = _money(discounted_subtotal + shipping)

        return PriceBreakdown(
            subtotal=subtotal,
            discount_amount=_money(discount),
            shipping_cost=_money(shipping),
            total_amount=total,
            total_weight_g=total_weight_g,
            strategy=self.name,
            coupon_code=coupon.code if coupon else None,
            notes=tuple(notes),
        )

    # -- overridable hooks ---------------------------------------------- #
    def compute_discount(
        self,
        subtotal: Decimal,
        coupon: Optional[Coupon],
        notes: list[str],
    ) -> Decimal:
        """Apply coupon discount logic. Subclasses may extend."""
        if coupon is None:
            return ZERO

        if coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
            amount = subtotal * (coupon.value / Decimal("100"))
            notes.append(f"Coupon {coupon.code}: -{coupon.value}%")
        else:  # FIXED
            amount = coupon.value
            notes.append(f"Coupon {coupon.code}: -{coupon.value} fixed")
        return _money(amount)

    @abc.abstractmethod
    def compute_shipping(
        self,
        discounted_subtotal: Decimal,
        total_weight_g: int,
        notes: list[str],
    ) -> Decimal:
        """Return the shipping cost for this order."""
        raise NotImplementedError


# --------------------------------------------------------------------------- #
# Concrete: Standard
# --------------------------------------------------------------------------- #
class StandardPricingStrategy(PricingStrategy):
    """
    Default strategy.

    Discount: coupon logic from the base class.
    Shipping: a base handling fee plus a weight-based component, waived once the
    discounted subtotal crosses the free-shipping threshold.
    """

    name = "standard"

    def compute_shipping(
        self,
        discounted_subtotal: Decimal,
        total_weight_g: int,
        notes: list[str],
    ) -> Decimal:
        if total_weight_g <= 0:
            return ZERO

        free_threshold = Decimal(str(getattr(settings, "SHIPPING_FREE_THRESHOLD", "0")))
        if free_threshold > ZERO and discounted_subtotal >= free_threshold:
            notes.append("Free shipping threshold reached.")
            return ZERO

        base_fee = Decimal(str(getattr(settings, "SHIPPING_BASE_FEE", "0")))
        rate_per_kg = Decimal(str(getattr(settings, "SHIPPING_RATE_PER_KG", "0")))
        weight_kg = Decimal(total_weight_g) / Decimal("1000")
        weight_component = (weight_kg * rate_per_kg).quantize(TWO_PLACES)

        notes.append(
            f"Shipping: base {base_fee} + {weight_kg.quantize(TWO_PLACES)}kg "
            f"x {rate_per_kg}/kg"
        )
        return _money(base_fee + weight_component)


# --------------------------------------------------------------------------- #
# Concrete: VIP / promotional
# --------------------------------------------------------------------------- #
class VIPDiscountStrategy(StandardPricingStrategy):
    """
    Promotional strategy for privileged users / campaigns.

    Demonstrates how calculation logic switches by role: it inherits the
    standard shipping rules but stacks an extra promo discount on top of any
    coupon, and grants free shipping outright.
    """

    name = "vip"

    def compute_discount(
        self,
        subtotal: Decimal,
        coupon: Optional[Coupon],
        notes: list[str],
    ) -> Decimal:
        base_discount = super().compute_discount(subtotal, coupon, notes)
        vip_rate = Decimal(str(getattr(settings, "VIP_DISCOUNT_RATE", "0.10")))
        remaining = subtotal - base_discount
        vip_discount = _money(remaining * vip_rate)
        notes.append(f"VIP campaign: -{(vip_rate * 100).quantize(TWO_PLACES)}%")
        return _money(base_discount + vip_discount)

    def compute_shipping(
        self,
        discounted_subtotal: Decimal,
        total_weight_g: int,
        notes: list[str],
    ) -> Decimal:
        if total_weight_g <= 0:
            return ZERO
        notes.append("VIP free shipping.")
        return ZERO


# --------------------------------------------------------------------------- #
# Selector / factory
# --------------------------------------------------------------------------- #
_STRATEGY_REGISTRY: dict[str, type[PricingStrategy]] = {
    StandardPricingStrategy.name: StandardPricingStrategy,
    VIPDiscountStrategy.name: VIPDiscountStrategy,
}


def register_strategy(cls: type[PricingStrategy]) -> type[PricingStrategy]:
    """Register a strategy class (usable as a decorator)."""
    _STRATEGY_REGISTRY[cls.name] = cls
    return cls


def get_pricing_strategy(
    *, name: Optional[str] = None, user: Any = None
) -> PricingStrategy:
    """
    Resolve a pricing strategy.

    Priority:
        1. Explicit `name` (e.g. an admin-selected campaign).
        2. Role inference: ADMIN/OWNER users get the VIP strategy by default.
        3. Fallback to the standard strategy.
    """
    if name:
        strategy_cls = _STRATEGY_REGISTRY.get(name.lower())
        if strategy_cls is None:
            raise ValueError(f"Unknown pricing strategy: '{name}'.")
        return strategy_cls(user=user)

    if user is not None and getattr(user, "is_admin", False):
        return VIPDiscountStrategy(user=user)

    return StandardPricingStrategy(user=user)
