"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My scans", href: "/dashboard/scans" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Settings", href: "/dashboard/settings" },
  { label: "Logout", href: "/logout" },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const activeItem = useMemo(() => {
    const match = navItems.find((item) => item.href === pathname);
    return match?.label || navItems[0].label;
  }, [pathname]);

  const sidebarWidth = collapsed ? "w-20" : "w-64";

  const handleNavItemClick = async (item) => {
    if (item.label === "Logout") {
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.replace("/");
      return;
    }
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside
          className={`${sidebarWidth} sticky top-0 flex h-screen flex-col border-r border-slate-200 bg-white px-4 py-6 transition-all duration-300 ease-out`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-[0.4em] text-sky-600">AQ</span>
              {!collapsed && <p className="text-sm text-slate-500">Console</p>}
            </div>
            <button
              type="button"
              aria-label="Toggle sidebar"
              className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:bg-slate-100"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <nav className="mt-10 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left text-sm uppercase tracking-[0.35em] transition ${
                  activeItem === item.label
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => handleNavItemClick(item)}
              >
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            <p>Samples today: 212</p>
            <p>Anomalies: 14</p>
            <p>Compliance: 99.1%</p>
          </div>
          {!collapsed && (
            <Link href="/" className="mt-3 text-xs uppercase tracking-[0.4em] text-sky-600">
              Back to site
            </Link>
          )}
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}