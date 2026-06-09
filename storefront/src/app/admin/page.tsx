import { redirect } from "next/navigation";

/**
 * مسیر `/admin` به داشبورد هدایت می‌شود.
 * (تنها صفحه‌ی واقعی پنل، `/admin/dashboard` است.)
 */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
