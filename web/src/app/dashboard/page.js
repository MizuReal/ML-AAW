"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import UserSamples from "./user_samples";


const statCards = [
  {
    label: "Samples processed",
    value: "1,482",
    delta: "+12%",
    detail: "vs. last 7 days",
  },
  {
    label: "Pending reviews",
    value: "37",
    delta: "-18%",
    detail: "Analysts in progress",
  },
  {
    label: "Alerts raised",
    value: "9",
    delta: "+3",
    detail: "High-severity",
  },
  {
    label: "Mean lead time",
    value: "41h",
    delta: "-6h",
    detail: "Prediction head start",
  },
];

const scanFeed = [
  {
    id: "#AQ-2048",
    source: "Lagos Surface Plant",
    analytes: "E.coli, Nitrates",
    status: "Flagged",
    timestamp: "12:04 UTC",
  },
  {
    id: "#AQ-2047",
    source: "Kisumu Delta",
    analytes: "Heavy metals",
    status: "Stable",
    timestamp: "11:42 UTC",
  },
  {
    id: "#AQ-2046",
    source: "Manila North",
    analytes: "Microcystin",
    status: "Pending",
    timestamp: "11:03 UTC",
  },
  {
    id: "#AQ-2045",
    source: "Lisbon Reservoir",
    analytes: "PFAS",
    status: "Stable",
    timestamp: "10:18 UTC",
  },
];

const forecastBands = [
  { label: "Microbial", score: 0.62 },
  { label: "Chemical", score: 0.48 },
  { label: "Infrastructure", score: 0.33 },
  { label: "Supply chain", score: 0.26 },
];

const configMissing = !supabase || !isSupabaseConfigured;

export default function DashboardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const todaysSummary = useMemo(
    () => ({
      samples: 212,
      anomalies: 14,
      compliance: "99.1%",
    }),
    [],
  );

  useEffect(() => {
    if (configMissing) {
      return;
    }

    let isMounted = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (error) {
        setAuthError("Unable to verify your session. Please try logging in again.");
        setChecking(false);
        return;
      }
      if (!data?.session) {
        setRedirecting(true);
        router.replace("/");
        return;
      }
      setAuthReady(true);
      setChecking(false);
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthReady(false);
        setRedirecting(true);
        router.replace("/");
      } else {
        setAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);


  if (configMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div className="max-w-md space-y-4">
          <p className="text-xl font-semibold">Configure Supabase auth</p>
          <p className="text-sm text-white/70">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to web/.env.local so we can secure the dashboard route.
          </p>
          <Link className="text-sm uppercase tracking-[0.3em] text-cyan-200" href="/">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div className="max-w-md space-y-4">
          <p className="text-xl font-semibold">Authentication unavailable</p>
          <p className="text-sm text-white/70">{authError}</p>
          <Link className="text-sm uppercase tracking-[0.3em] text-cyan-200" href="/">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  if (checking || !authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div className="space-y-4">
          <p className="text-xl font-semibold">{redirecting ? "Redirecting you to login" : "Verifying your session"}…</p>
          <p className="text-sm text-white/70">Hang tight while we secure your workspace.</p>
        </div>
      </div>
    );
  }

  return (
        <section className="flex-1 px-6 py-10 lg:px-12">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">Mission dashboard</p>
              <h1 className="text-3xl font-semibold">Water safety control room</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full border border-white/20 px-5 py-2 text-sm uppercase tracking-[0.3em] text-white/80">
                Export report
              </button>
              <button className="rounded-full bg-cyan-300 px-5 py-2 text-sm uppercase tracking-[0.3em] text-slate-900">
                Launch scan
              </button>
            </div>
          </header>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <article key={card.label} className="glass-panel space-y-3 p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">{card.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-semibold">{card.value}</p>
                  <span className="text-xs text-lime-200">{card.delta}</span>
                </div>
                <p className="text-sm text-white/60">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="glass-panel flex flex-col gap-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Live scan feed</p>
                  <p className="text-sm text-white/60">Data synced at 30-second cadence</p>
                </div>
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {scanFeed.map((scan) => (
                  <div
                    key={scan.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:-translate-y-0.5 hover:border-white/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-white">{scan.id}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                          scan.status === "Flagged"
                            ? "bg-red-400/20 text-red-200"
                            : scan.status === "Pending"
                              ? "bg-amber-400/20 text-amber-100"
                              : "bg-emerald-400/20 text-emerald-100"
                        }`}
                      >
                        {scan.status}
                      </span>
                    </div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/60">{scan.source}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/60">
                      <span>{scan.analytes}</span>
                      <span>Updated {scan.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass-panel flex flex-col gap-6 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">Risk radar</p>
                <p className="text-sm text-white/60">Composite forecast confidence</p>
              </div>
              <div className="space-y-4">
                {forecastBands.map((band) => (
                  <div key={band.label}>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/60">
                      <span>{band.label}</span>
                      <span>{Math.round(band.score * 100)}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-lime-200" style={{ width: `${band.score * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                Models ingest IoT telemetry, OCR payloads, and lab assays. Drift monitors set retraining reminders automatically.
              </div>
            </article>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="glass-panel space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Analyst queue</p>
                  <p className="text-sm text-white/60">Who is resolving alerts</p>
                </div>
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">Assign</button>
              </div>
              <table className="w-full text-left text-sm text-white/80">
                <thead className="text-xs uppercase tracking-[0.35em] text-white/60">
                  <tr>
                    <th className="py-2">Analyst</th>
                    <th className="py-2">Region</th>
                    <th className="py-2">Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {["Elena", "Mats", "Vic", "Dara"].map((name, index) => (
                    <tr key={name}>
                      <td className="py-2">{name}</td>
                      <td className="py-2">{["APAC", "EU", "LATAM", "NA"][index]}</td>
                      <td className="py-2">{["4", "3", "5", "2"][index]} cases</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="glass-panel space-y-4 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">Playbooks</p>
                <p className="text-sm text-white/60">Automations on standby</p>
              </div>
              <div className="space-y-3">
                {["Boil notice SMS", "Resample request", "SCADA throttle", "WHO escalation"].map((playbook, index) => (
                  <div key={playbook} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <div>
                      <p className="text-white">{playbook}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Trigger {index + 1}</p>
                    </div>
                    <button className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">Test</button>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="mt-10">
            <UserSamples />
          </div>
        </section>
  );
}
