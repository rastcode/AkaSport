import Link from "next/link";

/** Shown when an authenticated but under-privileged user hits a staff route. */
export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dust-grey px-6 text-center">
      <p className="text-6xl font-black text-silver">403</p>
      <h1 className="mt-2 text-2xl font-bold text-iron-grey">Access denied</h1>
      <p className="mt-2 max-w-md text-blue-slate">
        You don’t have permission to view this area. If you believe this is a
        mistake, contact an administrator.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Back to home
      </Link>
    </main>
  );
}
