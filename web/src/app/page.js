"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Navigation from "@/components/Navigation";

/* ── Scroll-reveal hook ───────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* If already visible on mount (e.g. above the fold), reveal immediately */
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add("revealed");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* wrapper component so we can reuse the hook per-section */
function Reveal({ children, className = "", delay = 0, direction = "up" }) {
  const ref = useScrollReveal();
  const dirClass =
    direction === "left"
      ? "scroll-reveal-left"
      : direction === "right"
        ? "scroll-reveal-right"
        : "scroll-reveal";
  return (
    <div
      ref={ref}
      className={`${dirClass} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ── Supabase storage base URL (public bucket) ────────────── */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const storageUrl = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public` : "";

/* ── Wide Carousel — what the system does ─────────────────── */
const carouselSlides = [
  {
    type: "video",
    src: `${storageUrl}/Video/Man_Drinking_Water.mp4`,
    alt: "Clean drinking water",
    title: "Safe Water, Verified by AI",
    description:
      "AquaScope ensures every glass of water is backed by machine learning predictions, WHO-standard checks, and real-time microbial risk grading.",
    accent: "sky",
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1400&q=80",
    alt: "Scientist scanning a water quality form with a phone",
    title: "OCR Form Scanning",
    description:
      "Point your camera at a standardized data card. Fiducial markers auto-align the image and our OCR engine extracts all water quality parameters in under 6 seconds.",
    accent: "sky",
  },
  {
    src: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1400&q=80",
    type: "image",
    alt: "Water sample being tested in a laboratory",
    title: "ML Potability Prediction",
    description:
      "Submit pH, turbidity, chloramines and 6 more parameters. Our gradient-boosted model evaluates potability against WHO standards and returns an explainable risk score.",
    accent: "emerald",
  },
  {
    src: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1400&q=80",
    type: "image",
    alt: "Microscopic view of bacteria in water",
    title: "Microbial Risk Grading",
    description:
      "Bacteria colony counts are mapped to WHO risk categories. The system identifies specific organisms, checks threshold violations, and provides color-coded safety indicators.",
    accent: "amber",
  },
  {
    src: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&q=80",
    type: "image",
    alt: "AI chatbot interface on a screen",
    title: "AI Chat Assistant",
    description:
      "Ask questions about your results in plain language. Powered by Groq's Llama 3.3 70B, the chatbot explains anomalies, suggests filtration methods, and generates compliance summaries.",
    accent: "violet",
  },
  {
    src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80",
    type: "image",
    alt: "Dashboard analytics on a monitor",
    title: "Prediction History & Analytics",
    description:
      "Every sample is saved to your secure Supabase workspace. Browse past predictions, drill into confidence metrics, and track risk trends over time from web or mobile.",
    accent: "rose",
  },
];

/* ── Steps ────────────────────────────────────────────────── */
const steps = [
  {
    number: "01",
    title: "Capture & Digitize",
    description:
      "Scan handwritten lab forms, field photos, and sensor readings using your phone or tablet. Our OCR engine auto-aligns fiducial markers, extracts every field, and validates entries — all in under 6 seconds.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
      </svg>
    ),
    color: "bg-sky-50 text-sky-600 border-sky-200",
    accent: "text-sky-600",
  },
  {
    number: "02",
    title: "ML Analysis",
    description:
      "Multiple machine learning models — computer vision, gradient boosting, and graph networks — analyze your water sample data simultaneously. Every prediction includes feature-level explanations so you know exactly what's driving the result.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    accent: "text-emerald-600",
  },
  {
    number: "03",
    title: "Risk Prediction",
    description:
      "Our potability classifier cross-references WHO guidelines to produce a safety score, while the microbial risk engine grades bacterial contamination from historical and real-time data. Results are explained in plain language.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    color: "bg-amber-50 text-amber-600 border-amber-200",
    accent: "text-amber-600",
  },
  {
    number: "04",
    title: "AI-Powered Insights",
    description:
      "An integrated LLM chatbot interprets your results in context — explain anomalies, suggest next steps, compare against historical baselines, and generate compliance-ready summaries, all through natural conversation.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    color: "bg-violet-50 text-violet-600 border-violet-200",
    accent: "text-violet-600",
  },
];

/* ── Features ─────────────────────────────────────────────── */
const features = [
  {
    title: "OCR Form Scanning",
    description:
      "Fiducial-marker alignment auto-extracts handwritten lab data from paper forms into structured fields.",
    icon: "📄",
  },
  {
    title: "Potability Prediction",
    description:
      "Gradient-boosted model evaluates pH, hardness, chloramines, and 6 more parameters against WHO standards.",
    icon: "🧪",
  },
  {
    title: "Microbial Risk Grading",
    description:
      "Bacteria colony counts are mapped to WHO risk categories with color-coded safety indicators.",
    icon: "🦠",
  },
  {
    title: "LLM Chat Assistant",
    description:
      "Ask questions about your results in plain language. Powered by Groq for fast, contextual responses.",
    icon: "💬",
  },
  {
    title: "Supabase Integration",
    description:
      "All samples, predictions, and user data stored securely with row-level security and real-time sync.",
    icon: "🔒",
  },
  {
    title: "Cross-Platform Access",
    description:
      "Web dashboard and React Native mobile app share the same backend — analyze anywhere, anytime.",
    icon: "📱",
  },
];

/* ── Stats ────────────────────────────────────────────────── */
const stats = [
  { label: "Parameters analyzed", value: "9+" },
  { label: "Prediction accuracy", value: "94%" },
  { label: "OCR extraction time", value: "<6s" },
  { label: "Risk categories", value: "4" },
];

/* ══════════════════════════════════════════════════════════════
   Image Carousel Component
   ══════════════════════════════════════════════════════════════ */
function ImageCarousel() {
  const [current, setCurrent] = useState(0);
  const len = carouselSlides.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % len), [len]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + len) % len), [len]);

  /* auto‑advance */
  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  const slide = carouselSlides[current];

  return (
    <div className="carousel-root relative overflow-hidden bg-white">
      {/* media (image or video) */}
      <div className="relative h-[400px] w-full sm:h-[500px] lg:h-[600px]">
        {carouselSlides.map((s, i) =>
          s.type === "video" ? (
            <video
              key={i}
              src={s.src}
              autoPlay
              muted
              loop
              playsInline
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === current ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />
          ) : (
            <img
              key={i}
              src={s.src}
              alt={s.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === current ? "opacity-100" : "opacity-0"
              }`}
            />
          ),
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <h3 className="text-2xl font-bold text-white sm:text-3xl">{slide.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {slide.description}
          </p>
        </div>
      </div>

      {/* controls */}
      <div className="mx-auto flex max-w-6xl items-center justify-between bg-white px-6 py-4">
        <div className="flex gap-2">
          {carouselSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-8 bg-sky-600" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:text-sky-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:text-sky-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Home Page
   ══════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <>
      <Navigation />
      <main className="space-y-0">
        {/* ── Wide Image Carousel — edge-to-edge ────────────── */}
        <section className="bg-white">
          <ImageCarousel />
        </section>

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="hero-section px-6 pb-20 pt-16 lg:pb-28 lg:pt-24">
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <Reveal direction="left"><div className="space-y-8">
                <span className="stat-chip">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  AI-Powered Water Safety
                </span>
                <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl lg:text-6xl">
                  Predict water safety{" "}
                  <span className="text-sky-600">before</span> the risk arrives.
                </h1>
                <p className="max-w-xl text-lg text-slate-600">
                  AquaScope combines computer vision, machine learning, and AI chat to help labs,
                  field teams, and researchers analyze water quality faster and more accurately.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="#about"
                    className="rounded-full bg-sky-600 px-7 py-3.5 font-medium text-white shadow-lg shadow-sky-600/25 transition hover:-translate-y-0.5 hover:bg-sky-700"
                  >
                    Learn how it works
                  </a>
                  <a
                    href="#features"
                    className="rounded-full border border-slate-300 px-7 py-3.5 font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                  >
                    View features
                  </a>
                </div>
              </div></Reveal>

              <Reveal direction="right" delay={200}><div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <p className="text-3xl font-bold text-sky-600">{stat.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div></Reveal>
            </div>
          </div>
        </section>

        {/* ── Trusted-by marquee ─────────────────────────────── */}
        <section className="border-y border-slate-200 bg-slate-50 py-5">
          <div className="overflow-hidden">
            <div className="ticker-track whitespace-nowrap text-sm font-medium uppercase tracking-[0.3em] text-slate-400">
              {[
                "WHO Guidelines",
                "Supabase",
                "Groq AI",
                "React Native",
                "Next.js",
                "FastAPI",
                "WHO Guidelines",
                "Supabase",
                "Groq AI",
                "React Native",
                "Next.js",
                "FastAPI",
              ].map((label, i) => (
                <span key={`${label}-${i}`} className="inline-flex items-center gap-4 pr-4">
                  {label}
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── About ─────────────────────────────────────────── */}
        <section id="about" className="bg-white px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal><div className="mx-auto max-w-3xl text-center">
              <span className="stat-chip mx-auto">About AquaScope</span>
              <h2 className="mt-6 text-3xl font-bold text-slate-900 md:text-4xl">
                What does this system do?
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                AquaScope is an end-to-end water quality intelligence platform. It takes raw water
                sample data — whether from paper forms, mobile input, or sensors — and transforms it
                into actionable safety predictions using machine learning. The system scans physical
                lab forms via OCR, runs potability predictions against WHO standards, grades microbial
                contamination risk, and provides an AI chatbot to help interpret results in plain
                language. Everything is stored securely and accessible from both web and mobile.
              </p>

              {/* App Store / Play Store callout */}
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Available on Mobile</p>
                      <p className="text-xs text-slate-500">
                        Download on the App Store &amp; Google Play Store
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Web Dashboard</p>
                      <p className="text-xs text-slate-500">
                        Access from any browser — no install needed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div></Reveal>

            <div className="mt-16 space-y-3">
              <Reveal><p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                How it works — step by step
              </p></Reveal>
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {steps.map((step, i) => (
                  <Reveal key={step.number} delay={i * 120}><article className="step-card flex flex-col p-8">
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${step.color}`}
                      >
                        {step.icon}
                      </div>
                      <span className={`text-3xl font-bold ${step.accent} opacity-30`}>
                        {step.number}
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">
                      {step.description}
                    </p>
                  </article></Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section id="features" className="bg-slate-50 px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <span className="stat-chip">Platform capabilities</span>
                <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
                  Everything you need for water analysis
                </h2>
              </div>
              <p className="max-w-md text-base text-slate-500">
                From rapid OCR to AI chat, every tool is designed to make water quality analysis
                faster and more reliable.
              </p>
            </div></Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {features.map((card, i) => (
                <Reveal key={card.title} delay={i * 100}><article className="feature-card p-8">
                  <span className="text-3xl">{card.icon}</span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{card.description}</p>
                </article></Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA — Light mode ──────────────────────────────── */}
        <Reveal><section className="px-6 py-20">
          <div className="cta-section-light mx-auto max-w-6xl rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-50 p-12 md:p-16">
            <div className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-slate-900 md:text-4xl">
                  Ready to analyze your water samples?
                </h3>
                <p className="max-w-lg text-base text-slate-500">
                  Sign up to start scanning forms, running predictions, and chatting with our AI — all
                  from your browser or mobile device.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-4">
                <a
                  href="#"
                  className="rounded-full bg-sky-600 px-7 py-3.5 font-medium text-white shadow-lg shadow-sky-600/25 transition hover:-translate-y-0.5 hover:bg-sky-700"
                >
                  Get started free
                </a>
                <a
                  href="#about"
                  className="rounded-full border border-slate-300 px-7 py-3.5 font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                >
                  Learn more
                </a>
              </div>
            </div>
          </div>
        </section></Reveal>

        {/* ── Footer ────────────────────────────────────────── */}
        <footer className="border-t border-slate-200 bg-white px-6 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-400 md:flex-row">
            <span className="font-semibold tracking-[0.3em] text-slate-900">AQUASCOPE</span>
            <p>&copy; {new Date().getFullYear()} AquaScope Intelligence. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
