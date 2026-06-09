/**
 * Analytics service layer — Owner dashboard (`/api/analytics/dashboard/`).
 */

import api from "@/lib/api";
import type { DashboardData, DashboardPeriod } from "@/types/analytics";

/** Fetch the aggregated owner dashboard for a period. */
export async function fetchDashboard(
  period: DashboardPeriod = "monthly",
): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>(
    `/analytics/dashboard/?period=${period}`,
  );
  return data;
}
