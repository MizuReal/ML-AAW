import HeroCarousel from "@/components/HeroCarousel";
import Navigation from "@/components/Navigation";
import ShowcaseCarousel from "@/components/ShowcaseCarousel";

const showcaseSlides = [
  {
    src: "https://www.bvwater.co.uk/hubfs/microbiology_bacteria.jpeg",
    alt: "Microscopic bacteria clusters glowing under lab light",
    title: "Biofilm intelligence streaming from 42 provinces",
    description:
      "Deep UV imaging syncs with AquaScope so public health leads see microbial drift propagate in near real time.",
    badge: "Biofilm Lab Feed",
    location: "Medellin Biolab",
    tagline: "Signal clarity in every pixel",
  },
  {
    src: "https://plantbasedwithamy.com/wp-content/uploads/2020/06/pexels-pixabay-416528-1024x731.jpg.webp",
    alt: "Rows of glass vials capturing clean water samples",
    title: "Trace metal staging before distribution",
    description:
      "Spectral fingerprints from ICP-MS batches stream into the console so you can release reservoirs with confidence.",
    badge: "ICP Run 482",
    location: "Oslo Surface Station",
    tagline: "From assay bench to digital twin",
  },
  {
    src: "https://cdn.the-scientist.com/assets/articleNo/71687/aImg/52292/62dc0501-8dda-4bd7-9ba9-fa1a9b8c7cb4-l.jpg",
    alt: "Scientist observing river sensors at dusk",
    title: "Field telemetry stitched to central AI",
    description:
      "Low-bandwidth probes share turbidity, dissolved oxygen, and imagery into one command surface for rapid action.",
    badge: "RiverWatch",
    location: "Kisumu Delta",
    tagline: "Edge data, unified decisions",
  },
];

const heroSlides = [
  {
    src: "https://www.bvwater.co.uk/hubfs/microbiology_bacteria.jpeg",
    alt: "Microscopic view of waterborne bacteria colonies",
    title: "Microbial Bloom Sentinel",
    badge: "Turbidity + e.Coli",
    risk: "0.02",
    caption:
      "Vision transformers highlight colony growth above baseline and sync with IoT sondes to predict bloom formation before it hits municipal supply.",
  },
  {
    src: "https://plantbasedwithamy.com/wp-content/uploads/2020/06/pexels-pixabay-416528-1024x731.jpg.webp",
    alt: "Laboratory glassware capturing clean water sample",
    title: "Heavy Metal Forecast",
    badge: "ICP-MS Series",
    risk: "0.11",
    caption:
      "Sequence-aware models learn each plant's fingerprint and surface when cadmium deviates from historical drift, giving you 48h to intervene.",
  },
  {
    src: "https://cdn.the-scientist.com/assets/articleNo/71687/aImg/52292/62dc0501-8dda-4bd7-9ba9-fa1a9b8c7cb4-l.jpg",
    alt: "Field scientist observing river quality",
    title: "Rural Well Insights",
    badge: "Nitrates + VOCs",
    risk: "0.04",
    caption:
      "Offline kits pair with AquaScope to align paperwork, photos, and sensor data so rural wells get the same AI guardrails as urban systems.",
  },
];

const featureCards = [
  {
    title: "Vision-guided ingestion",
    description:
      "Fiducial markers auto-align handwritten lab forms, isolates every field, and pipes values straight into your LIMS in under 6 seconds.",
    bullets: ["Auto-orients skewed scans", "Detects 180+ lab glyphs"],
  },
  {
    title: "Contextual ML scoring",
    description:
      "Graph models mix assay readings, weather feeds, and historical outbreaks to surface the exact feature stack driving each alert.",
    bullets: ["Explainable feature attributions", "Adaptive baselines per source"],
  },
  {
    title: "Collaborative evidence boards",
    description:
      "Share AI-backed dossiers that merge microscopy, geo tags, and audit trails so compliance teams sign off faster.",
    bullets: ["HIPAA & ISO27001 ready", "Immutable chain-of-custody"],
  },
  {
    title: "Streamlined field ops",
    description:
      "Guide crews with offline-first checklists, QR-coded assets, and automatic resampling prompts built from ML confidence.",
    bullets: ["Works in low-connectivity zones", "Predictive route planning"],
  },
  {
    title: "Data broker connectors",
    description:
      "Drop-in pipelines for CDC, WHO, and local regulators so they see sanitized exports the moment your models approve them.",
    bullets: ["Supabase native sync", "Air-gapped exports"],
  },
  {
    title: "Trust & governance",
    description:
      "Granular policy engine, SOC2 controls, and instant audit packs built for public utilities and biotech alike.",
    bullets: ["Row-level observability", "Model drift redlines"],
  },
];

const flowSteps = [
  {
    stage: "01",
    title: "Capture & digitize",
    description:
      "Field tablets scan lab sheets, photos, and sensor payloads together. OCR confidence heatmaps show where AI double-checks by design.",
    metricLabel: "Data points",
    metric: "482",
    background:
      "radial-gradient(circle at 10% 20%, rgba(207,255,114,0.25), transparent 55%), rgba(6, 18, 39, 0.85)",
  },
  {
    stage: "02",
    title: "Model ensemble",
    description:
      "Computer vision, gradient boosting, and graph networks vote on risk. We log every feature weight so analysts see exactly why.",
    metricLabel: "Models",
    metric: "5",
    background:
      "radial-gradient(circle at 80% 0%, rgba(111,125,255,0.25), transparent 60%), rgba(5, 15, 32, 0.92)",
  },
  {
    stage: "03",
    title: "Human-in-the-loop",
    description:
      "Compliance reviewers co-pilot with AI suggestions, annotate anomalies, and feed verdicts back into continuous training.",
    metricLabel: "Review time",
    metric: "-63%",
    background:
      "radial-gradient(circle at 50% 50%, rgba(79,209,249,0.18), transparent 65%), rgba(4, 12, 27, 0.9)",
  },
  {
    stage: "04",
    title: "Automated response",
    description:
      "Trigger SMS advisories, resampling tickets, or API pushes to SCADA the second AquaScope marks a threshold breach.",
    metricLabel: "Playbooks",
    metric: "14",
    background:
      "radial-gradient(circle at 0% 80%, rgba(79,209,249,0.2), transparent 55%), rgba(5, 14, 30, 0.95)",
  },
];

const stats = [
  { label: "Sensors unified", value: "212" },
  { label: "Cities protected", value: "48" },
  { label: "Avg. detection lead", value: "37h" },
];

const marqueeItems = [
  "WHO Innovation",
  "Global Water Labs",
  "RiverWatch Coalition",
  "Helios Utilities",
  "Aqua for All",
  "LabStack",
];

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="relative space-y-24 pb-32">
        <ShowcaseCarousel slides={showcaseSlides} />
        <section className="px-6 pt-12 lg:pt-20">
          <div className="hero-gradient mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-8">
              <span className="metric-chip inline-flex items-center gap-2 text-[0.65rem] tracking-[0.3em] text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-lime-200" />
                LIVE SAFETY CLOUD
              </span>
              <div className="space-y-6">
                <h1 className="text-4xl leading-tight text-white md:text-5xl lg:text-6xl">
                  Machine learning that reads water before the risk arrives.
                </h1>
                <p className="max-w-2xl text-lg text-slate-200">
                  AquaScope blends computer vision, probabilistic ML, and human insight so water utilities, labs, and
                  research teams stay ahead of contamination events, not behind them.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button className="rounded-full bg-cyan-300 px-6 py-3 text-slate-900 transition hover:-translate-y-0.5 hover:bg-cyan-200">
                  Launch the console
                </button>
                <button className="rounded-full border border-white/30 px-6 py-3 text-white transition hover:-translate-y-0.5 hover:border-white/60">
                  Book a walkthrough
                </button>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                    <p className="text-sm uppercase tracking-[0.25em] text-white/70">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <HeroCarousel slides={heroSlides} />
          </div>
          <div className="mt-16 overflow-hidden rounded-full border border-white/10 bg-white/5 py-3">
            <div className="ticker-track whitespace-nowrap text-sm uppercase tracking-[0.4em] text-white/70">
              {[...marqueeItems, ...marqueeItems].map((label, index) => (
                <span key={`${label}-${index}`} className="flex items-center gap-3">
                  {label}
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                </span>
              ))}
            </div>
          </div>
          </div>
        </section>

        <section id="about" className="px-6">
          <div className="mx-auto max-w-6xl space-y-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="metric-chip text-cyan-200">Why teams switch</span>
              <h2 className="text-3xl text-white md:text-4xl">Purpose-built for water intelligence workflows.</h2>
            </div>
            <p className="max-w-2xl text-base text-slate-300">
              From rapid OCR of field kits to explainable outbreak prediction, AquaScope pairs senior ML talent with
              intuitive UX so every lab scientist feels like an analyst.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="glass-panel water-grid relative h-full p-8">
                <div className="relative z-10 space-y-4">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">{card.title}</p>
                  <p className="text-base text-slate-200">{card.description}</p>
                  <ul className="text-sm text-slate-400">
                    {card.bullets.map((item) => (
                      <li key={item} className="flex items-center gap-2 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime-200" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
          </div>
        </section>

        <section id="dashboard" className="px-6">
          <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="glass-panel sticky top-10 space-y-6 p-10">
              <span className="metric-chip text-cyan-200">From sample to signal</span>
              <h3 className="text-3xl text-white">Scrolling timeline of your data lifecycle.</h3>
              <p className="text-base text-slate-300">
                Every stage is observable, auditable, and explainable so public health and data science teams stay in the
                same loop.
              </p>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>Predictive QA gates catch drift before it hits production playbooks.</li>
                <li>Time-aligned telemetry keeps IoT probes, lab assays, and ML insights synchronized.</li>
                <li>One-click exports satisfy regulators without duplicated effort.</li>
              </ul>
            </div>
            <div className="scroll-panel max-h-[640px] space-y-6 overflow-y-auto pr-1">
              {flowSteps.map((step) => (
                <article
                  key={step.title}
                  className="glass-panel relative space-y-4 p-8 transition duration-500 hover:-translate-y-1"
                  style={{ background: step.background }}
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/70">
                    <span>Step {step.stage}</span>
                    <span className="signal-dot inline-flex h-2 w-2 rounded-full bg-cyan-200/90" />
                  </div>
                  <h4 className="text-2xl text-white">{step.title}</h4>
                  <p className="text-sm text-slate-200">{step.description}</p>
                  <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/70">{step.metricLabel}</div>
                    <div className="text-2xl font-semibold text-white">{step.metric}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[36px] border border-white/10 bg-gradient-to-bl from-[#112741] via-[#081328] to-[#040b18] p-10 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <p className="metric-chip text-cyan-200">Deploy anywhere</p>
              <h4 className="text-3xl text-white">Host AquaScope next to your existing ML stack.</h4>
              <p className="text-base text-slate-300">
                Bring your Supabase instance, run in your VPC, and plug into the backend services already in this repo.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button className="rounded-full border border-white/30 px-5 py-3 text-sm uppercase tracking-[0.3em] text-white">
                Connect backend
              </button>
              <button className="rounded-full bg-white px-5 py-3 text-sm uppercase tracking-[0.3em] text-slate-900">
                View API docs
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
