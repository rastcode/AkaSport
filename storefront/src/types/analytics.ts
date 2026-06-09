/**
 * Analytics dashboard types — mirrors the Django `/api/analytics/dashboard/`
 * response (backend Part 5).
 */

import type { AttributeMap } from "@/types/product";

export type DashboardPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "all";

export interface DashboardSummary {
  total_revenue: string;
  total_orders: number;
  average_order_value: string;
  total_discount: string;
  total_shipping: string;
}

export interface RevenueByDayPoint {
  date: string | null;
  revenue: string;
  orders: number;
}

export interface TopSellingVariant {
  product_variant_id: number | null;
  sku: string;
  product_title: string;
  units_sold: number;
  revenue: string;
}

export interface LowStockAlert {
  product_variant_id: number;
  sku: string;
  product_title: string;
  stock_quantity: number;
  attributes: AttributeMap;
}

export interface DashboardData {
  period: DashboardPeriod;
  generated_at: string;
  summary: DashboardSummary;
  revenue_by_day: RevenueByDayPoint[];
  top_selling_variants: TopSellingVariant[];
  low_stock_alerts: LowStockAlert[];
}
