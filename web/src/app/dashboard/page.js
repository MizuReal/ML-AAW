"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import UserSamples from "./user_samples";

/* ── Real system stat cards ───────────────────────────────── */
const statCards = [
  {
    label: "ML parameters",
    value: "9",
    detail: "pH, hardness, solids, chloramines, sulfate, conductivity, organic carbon, trihalomethanes, turbidity",
    icon: "🧪",
  },
  {
    label: "OCR extraction",
    value: "<6s",
    detail: "Fiducial-aligned form scanning with EasyOCR engine",
    icon: "📄",
  },
  {
    label: "WHO risk levels",
    value: "4",
    detail: "Conformity, Low, Moderate, High / Very High risk bands",
    icon: "⚠️",
  },
  {
    label: "AI model",
    value: "70B",
    detail: "Groq Llama 3.3 for contextual chat & filtration advice",
    icon: "🤖",
  },
];

/* ── Water parameters analyzed by the ML model ────────────── */
const waterParameters = [
  { name: "pH", range: "6.5 – 8.5", unit: "", desc: "Acidity / alkalinity" },
  { name: "Hardness", range: "47 – 323", unit: "mg/L", desc: "Calcium & magnesium" },
  { name: "Solids", range: "320 – 61 227", unit: "ppm", desc: "Total dissolved solids" },
  { name: "Chloramines", range: "1.4 – 13.1", unit: "ppm", desc: "Disinfection level" },
  { name: "Sulfate", range: "129 – 481", unit: "mg/L", desc: "Mineral content" },
  { name: "Conductivity", range: "181 – 753", unit: "μS/cm", desc: "Ionic concentration" },
  { name: "Organic carbon", range: "2.2 – 28.3", unit: "ppm", desc: "Organic matter" },
  { name: "Trihalomethanes", range: "0.7 – 124", unit: "μg/L", desc: "Disinfection byproducts" },
  { name: "Turbidity", range: "1.5 – 6.7", unit: "NTU", desc: "Water clarity" },
];

/* ── Quick actions — real system features ─────────────────── */
const quickActions = [
  {
    title: "Scan a lab form",
    description: "Use OCR to capture water quality data from a printed or handwritten form",
    endpoint: "/ocr/data-card",
    icon: "📷",
    color: "bg-sky-50 border-sky-200 text-sky-700",
  },
  {
    title: "Predict potability",
    description: "Run the gradient-boosted model to check if a water sample is safe to drink",
    endpoint: "/predict/potability",
    icon: "🔬",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    title: "Assess microbial risk",
    description: "Grade bacteria colony counts against WHO thresholds and risk categories",
    endpoint: "/predict/microbial-risk",
    icon: "🦠",
    color: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    title: "Ask the AI assistant",
    description: "Get filtration suggestions and plain-language explanations from Llama 3.3",
    endpoint: "/chat/message",
    icon: "💬",
    color: "bg-violet-50 border-violet-200 text-violet-700",
  },
];

/* ── ML pipeline steps ────────────────────────────────────── */
const pipelineSteps = [
  { stage: "Data ingestion", detail: "REST API, OCR, or manual entry", status: "active" },
  { stage: "Fiducial detection", detail: "Auto-align scanned forms with marker recognition", status: "active" },
  { stage: "Feature extraction", detail: "9 water quality parameters normalized for ML", status: "active" },
  { stage: "Potability classifier", detail: "Gradient-boosted model with confidence score", status: "active" },
  { stage: "Microbial risk grading", detail: "WHO threshold mapping for bacteria counts", status: "active" },
  { stage: "LLM interpretation", detail: "Groq Llama 3.3 70B contextual explanation", status: "active" },
];

const configMissing = !supabase || !isSupabaseConfigured;

export default function DashboardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [userStats, setUserStats] = useState({ scans: 0, predictions: 0 });

  useEffect(() => {
    if (configMissing) return;

    let isMounted = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
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

      /* Fetch real user sample counts */
      try {
        const userId = data.session.user.id;
        const { count: fieldCount } = await supabase
          .from("field_samples")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        const { count: containerCount } = await supabase
          .from("container_samples")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        if (isMounted) {
          setUserStats({
            scans: (fieldCount || 0) + (containerCount || 0),
            predictions: fieldCount || 0,
          });
        }
      } catch {
        /* non-critical — dashboard still works with 0 counts */
      }
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-900">
        <div className="max-w-md space-y-4">
          <p className="text-xl font-semibold">Configure Supabase auth</p>
          <p className="text-sm text-slate-500">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to web/.env.local so we can secure the dashboard route.
          </p>
          <Link className="text-sm uppercase tracking-[0.3em] text-sky-600" href="/">Return home</Link>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-900">
        <div className="max-w-md space-y-4">
          <p className="text-xl font-semibold">Authentication unavailable</p>
          <p className="text-sm text-slate-500">{authError}</p>
          <Link className="text-sm uppercase tracking-[0.3em] text-sky-600" href="/">Return home</Link>
        </div>
      </div>
    );
  }

  if (checking || !authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-900">
        <div className="space-y-4">
          <p className="text-xl font-semibold">{redirecting ? "Redirecting you to login" : "Verifying your session"}…</p>
          <p className="text-sm text-slate-500">Hang tight while we secure your workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex-1 px-6 py-10 lg:px-12">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-sky-600">Dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-900">Water Quality Control Room</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm text-slate-600">
            Your scans: <strong className="text-sky-600">{userStats.scans}</strong>
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm text-slate-600">
            Predictions: <strong className="text-sky-600">{userStats.predictions}</strong>
          </span>
        </div>
      </header>

      {/* ── System stat cards ───────────────────────────── */}
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{card.icon}</span>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{card.label}</p>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{card.detail}</p>
          </article>
        ))}
      </div>

      {/* ── Quick Actions + Water Parameters ────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Quick Actions */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Quick actions</p>
            <p className="text-sm text-slate-500">Core system capabilities you can run right now</p>
          </div>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className={`rounded-2xl border px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-sm ${action.color}`}
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 text-2xl">{action.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{action.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                    <p className="mt-2 font-mono text-xs text-slate-400">{action.endpoint}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Water parameters */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Water quality parameters</p>
            <p className="text-sm text-slate-500">9 features analyzed by the potability model</p>
          </div>
          <div className="space-y-2">
            {waterParameters.map((param) => (
              <div
                key={param.name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{param.name}</p>
                  <p className="text-xs text-slate-400">{param.desc}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-slate-600">{param.range}</p>
                  {param.unit && (
                    <p className="text-xs text-slate-400">{param.unit}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* ── ML Pipeline ─────────────────────────────────── */}
      <div className="mt-10">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">ML pipeline</p>
            <p className="text-sm text-slate-500">End-to-end processing stages in AquaScope</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pipelineSteps.map((step, i) => (
              <div
                key={step.stage}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-xs font-bold text-sky-600">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{step.stage}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* ── User Samples ────────────────────────────────── */}
      <div className="mt-10">
        <UserSamples />
      </div>
    </section>
  );
}
