"use client";

import Link from "next/link";

const adminCards = [
  {
    label: "Profiles",
    value: "Role-controlled",
    detail: "Access is granted from public.profiles.role where 1 = admin.",
    icon: "👤",
  },
  {
    label: "Data quality",
    value: "Monitored",
    detail: "Review water sample consistency and validation trends.",
    icon: "🧪",
  },
  {
    label: "System status",
    value: "Operational",
    detail: "Auth, OCR, and ML pipelines are available from the control room.",
    icon: "🛰️",
  },
];

export default function AdminDashboardPage() {
  return (
    <section className="flex-1 px-6 py-10 lg:px-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-sky-600">Admin Dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-900">AquaScope Admin Control Room</h1>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm text-slate-600">
          Role check: <strong className="text-sky-600">1 (admin)</strong>
        </span>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {adminCards.map((card) => (
          <article key={card.label} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{card.icon}</span>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{card.label}</p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="text-xs leading-relaxed text-slate-500">{card.detail}</p>
          </article>
        ))}
      </div>

      <article className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Admin navigation</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Open the User control page from the sidebar to manage roles and activation status.
          </div>
          <Link
            href="/admin/users"
            className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 transition hover:bg-sky-100"
          >
            Go to User control
          </Link>
        </div>
      </article>
    </section>
  );
}
