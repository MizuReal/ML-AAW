"use client";

import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

import noAnim from "../../../public/not.json";
import warnAnim from "../../../public/warning.json";
import yesAnim from "../../../public/yes.json";

const WATER_SAMPLES_TABLE =
	process.env.NEXT_PUBLIC_SUPABASE_SAMPLES_TABLE || "field_samples";
const CONTAINER_SAMPLES_TABLE =
	process.env.NEXT_PUBLIC_CONTAINER_SAMPLES_TABLE || "container_samples";

const formatTimestamp = (value) => {
	if (!value) return "timestamp unavailable";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "timestamp unavailable";
	return date.toLocaleString();
};

const deriveStatus = (riskLevel) => {
	const risk = (riskLevel || "").toLowerCase();
	if (risk === "safe" || risk === "borderline") return "Cleared";
	if (risk === "watch") return "Review";
	if (risk === "unsafe") return "Alert";
	return "Review";
};

const buildPredictedClass = (row) => {
	const isPotable = row?.prediction_is_potable;
	if (typeof isPotable !== "boolean") {
		return row?.risk_level ? `Risk: ${row.risk_level}` : "Prediction pending";
	}
	if (isPotable) {
		return row?.risk_level ? `Potable (${row.risk_level})` : "Potable";
	}
	return row?.risk_level ? `Non-potable (${row.risk_level})` : "Non-potable";
};

const buildDisplayRow = (row, type) => {
	const confidence = Number.isFinite(row?.prediction_probability)
		? Number(row.prediction_probability)
		: 0;
	return {
		id: row?.id || "unknown",
		timestamp: formatTimestamp(row?.created_at),
		location: row?.sample_label || row?.source || (type === "container" ? "Container" : "Sample"),
		predictedClass: buildPredictedClass(row),
		confidence,
		status: deriveStatus(row?.risk_level),
		raw: row,
		type,
	};
};

const STATUS_STYLES = {
	Cleared: "border-emerald-200 bg-emerald-50 text-emerald-700",
	Review: "border-amber-200 bg-amber-50 text-amber-700",
	Alert: "border-rose-200 bg-rose-50 text-rose-700",
};

const CONFIDENCE_BANDS = [
	{ label: "Low", range: [0, 0.5], color: "bg-rose-400" },
	{ label: "Moderate", range: [0.5, 0.7], color: "bg-amber-400" },
	{ label: "High", range: [0.7, 1], color: "bg-emerald-400" },
];

const getConfidenceMeta = (value) => {
	const safeValue = Number.isFinite(value) ? value : 0;
	const band = CONFIDENCE_BANDS.find(
		(entry) => safeValue >= entry.range[0] && safeValue < entry.range[1],
	);
	return band || CONFIDENCE_BANDS[0];
};

const getConfidenceAnimation = (value) => {
	if (!Number.isFinite(value)) return noAnim;
	if (value < 0.5) return noAnim;
	if (value < 0.7) return warnAnim;
	return yesAnim;
};

const CHECK_STYLES = {
	ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
	warning: "border-amber-200 bg-amber-50 text-amber-700",
	critical: "border-rose-200 bg-rose-50 text-rose-700",
	missing: "border-slate-200 bg-slate-50 text-slate-500",
};

const formatValue = (value, suffix = "") => {
	if (value === null || value === undefined) return "--";
	if (typeof value === "number" && Number.isFinite(value)) {
		return `${value.toFixed(2)}${suffix}`;
	}
	return `${value}${suffix}`;
};

export default function UserSamples() {
	const [activeTab, setActiveTab] = useState("water");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [waterItems, setWaterItems] = useState([]);
	const [containerItems, setContainerItems] = useState([]);
	const [detailItem, setDetailItem] = useState(null);
	const [detailOpen, setDetailOpen] = useState(false);

	const items = useMemo(
		() => (activeTab === "water" ? waterItems : containerItems),
		[activeTab, waterItems, containerItems],
	);

	useEffect(() => {
		if (!supabase || !isSupabaseConfigured) {
			return;
		}

		let isMounted = true;

		const loadSamples = async () => {
			setLoading(true);
			setError("");
			try {
				const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
				if (sessionError) {
					throw sessionError;
				}
				const userId = sessionData?.session?.user?.id;
				if (!userId) {
					if (isMounted) {
						setError("Sign in to view your history.");
						setWaterItems([]);
						setContainerItems([]);
					}
					return;
				}

				if (activeTab === "water") {
					const { data, error: samplesError } = await supabase
						.from(WATER_SAMPLES_TABLE)
						.select(
							"id, created_at, source, sample_label, color, notes, risk_level, model_version, prediction_probability, prediction_is_potable, anomaly_checks",
						)
						.eq("user_id", userId)
						.order("created_at", { ascending: false })
						.limit(50);

					if (samplesError) {
						throw samplesError;
					}

					const mapped = (data || []).map((row) => buildDisplayRow(row, "water"));
					if (isMounted) {
						setWaterItems(mapped);
					}
				} else {
					const { data, error: samplesError } = await supabase
						.from(CONTAINER_SAMPLES_TABLE)
						.select("*")
						.eq("user_id", userId)
						.order("created_at", { ascending: false })
						.limit(50);

					if (samplesError) {
						throw samplesError;
					}

					const mapped = (data || []).map((row) => buildDisplayRow(row, "container"));
					if (isMounted) {
						setContainerItems(mapped);
					}
				}
			} catch (err) {
				console.warn("[Supabase] history fetch failed:", err?.message || err);
				if (isMounted) {
					setError("Unable to load history right now.");
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		loadSamples();

		return () => {
			isMounted = false;
		};
	}, [activeTab]);

	return (
		<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-xs uppercase tracking-[0.35em] text-slate-500">
						Prediction history
					</p>
					<p className="text-sm text-slate-500">
						Recent water-quality and container scans tied to your account.
					</p>
				</div>
				<div className="flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs uppercase tracking-[0.3em]">
					<button
						type="button"
						className={`rounded-full px-4 py-2 transition ${
							activeTab === "water" ? "bg-sky-600 text-white shadow-sm" : "text-slate-500"
						}`}
						onClick={() => setActiveTab("water")}
					>
						Water quality
					</button>
					<button
						type="button"
						className={`rounded-full px-4 py-2 transition ${
							activeTab === "container" ? "bg-sky-600 text-white shadow-sm" : "text-slate-500"
						}`}
						onClick={() => setActiveTab("container")}
					>
						Container history
					</button>
				</div>
			</div>

			{loading ? (
				<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
					Loading your history...
				</div>
			) : null}

			{error && !loading ? (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
					{error}
				</div>
			) : null}

			{!loading && !error && items.length === 0 ? (
				<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
					No records yet. Run a scan to populate this history.
				</div>
			) : null}

			<div className="grid gap-4 md:grid-cols-2">
				{items.map((item) => {
					const statusStyle = STATUS_STYLES[item.status] || "border-slate-200 bg-slate-50 text-slate-500";
					return (
						<article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-xs uppercase tracking-[0.35em] text-slate-500">
										{activeTab === "water" ? "Sample" : "Container"}
									</p>
									<p className="text-base font-semibold text-slate-900">{item.location}</p>
									<p className="text-xs text-slate-400">{item.id}</p>
								</div>
								<span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${statusStyle}`}>
									{item.status}
								</span>
							</div>
							<div className="mt-3 text-sm text-slate-600">{item.predictedClass}</div>
							<div className="mt-2 flex items-center justify-between text-xs text-slate-400">
								<span>{item.timestamp}</span>
								<span>{Math.round(item.confidence * 100)}% confidence</span>
							</div>
							<div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
								<div
									className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
									style={{ width: `${Math.min(100, Math.max(5, item.confidence * 100))}%` }}
								/>
							</div>
							<div className="mt-4">
								<button
									type="button"
									className="rounded-full border border-slate-300 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
									onClick={() => {
										setDetailItem(item);
										setDetailOpen(true);
									}}
								>
									View details
								</button>
							</div>
						</article>
					);
				})}
			</div>

			{detailItem ? (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm px-6 py-10">
					<div
						className={`max-h-full w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl transition duration-200 ease-out ${
							detailOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
						}`}
					>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<p className="text-xs uppercase tracking-[0.35em] text-sky-600">
									{detailItem.type === "water" ? "Water quality detail" : "Container detail"}
								</p>
								<h2 className="text-2xl font-semibold text-slate-900">{detailItem.location}</h2>
								<p className="text-sm text-slate-500">{detailItem.timestamp}</p>
							</div>
							<button
								type="button"
								className="rounded-full border border-slate-300 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-500 hover:bg-slate-50"
								onClick={() => {
									setDetailOpen(false);
									setTimeout(() => setDetailItem(null), 180);
								}}
							>
								Close
							</button>
						</div>

						<div className="mt-6 flex flex-wrap items-center gap-6">
							<div className="h-28 w-28 rounded-2xl border border-slate-200 bg-slate-50 p-2">
								<Lottie
									animationData={getConfidenceAnimation(detailItem.confidence)}
									loop
									className="h-full w-full"
								/>
							</div>
							<div className="flex-1 space-y-2">
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">
									Confidence signal
								</p>
								<p className="text-3xl font-semibold text-slate-900">
									{Math.round(detailItem.confidence * 100)}%
								</p>
								<p className="text-sm text-slate-500">
									{getConfidenceMeta(detailItem.confidence).label} confidence tier
								</p>
							</div>
						</div>

						<div className="mt-6 grid gap-4 md:grid-cols-3">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Model verdict</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">{detailItem.predictedClass}</p>
								<p className="mt-2 text-xs text-slate-400">Risk level: {detailItem.raw?.risk_level || "n/a"}</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Model version</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{detailItem.raw?.model_version || "unavailable"}
								</p>
								<p className="mt-2 text-xs text-slate-400">Sample ID: {detailItem.id}</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Confidence</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{Math.round(detailItem.confidence * 100)}%
								</p>
								<p className="mt-2 text-xs text-slate-400">
									{getConfidenceMeta(detailItem.confidence).label} confidence
								</p>
							</div>
						</div>

						<div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<div className="flex items-center justify-between">
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Confidence analysis</p>
								<span
									className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] text-white ${getConfidenceMeta(detailItem.confidence).color}`}
								>
									{getConfidenceMeta(detailItem.confidence).label}
								</span>
							</div>
							<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
								<div
									className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
									style={{ width: `${Math.min(100, Math.max(5, detailItem.confidence * 100))}%` }}
								/>
							</div>
							<div className="mt-3 grid gap-3 text-xs text-slate-500 md:grid-cols-3">
								<div className="rounded-xl border border-slate-200 bg-white p-3">
									<p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Certainty</p>
									<p className="mt-2 text-base font-semibold text-slate-900">
										{Math.round(Math.abs(detailItem.confidence - 0.5) * 200)}%
									</p>
								</div>
								<div className="rounded-xl border border-slate-200 bg-white p-3">
									<p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Margin</p>
									<p className="mt-2 text-base font-semibold text-slate-900">
										{Math.round(Math.abs(detailItem.confidence - 0.58) * 100)}%
									</p>
								</div>
								<div className="rounded-xl border border-slate-200 bg-white p-3">
									<p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Reliability</p>
									<p className="mt-2 text-base font-semibold text-slate-900">
										{Math.round((detailItem.confidence >= 0.5 ? detailItem.confidence : 1 - detailItem.confidence) * 100)}%
									</p>
								</div>
							</div>
						</div>

						<div className="mt-6 grid gap-4 md:grid-cols-2">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sample context</p>
								<div className="mt-3 space-y-2 text-sm text-slate-600">
									<div className="flex items-center justify-between">
										<span>Source</span>
										<span>{detailItem.raw?.source || "n/a"}</span>
									</div>
									<div className="flex items-center justify-between">
										<span>Color</span>
										<span>{detailItem.raw?.color || "n/a"}</span>
									</div>
									<div className="flex items-center justify-between">
										<span>Label</span>
										<span>{detailItem.raw?.sample_label || "n/a"}</span>
									</div>
									<div className="flex items-center justify-between">
										<span>Notes</span>
										<span className="text-right">{detailItem.raw?.notes || "n/a"}</span>
									</div>
								</div>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs uppercase tracking-[0.3em] text-slate-500">Anomaly checks</p>
								{Array.isArray(detailItem.raw?.anomaly_checks) && detailItem.raw.anomaly_checks.length ? (
									<div className="mt-3 space-y-2 text-sm text-slate-600">
										{detailItem.raw.anomaly_checks.map((check, index) => (
											<div
												key={`${check.field || "check"}-${index}`}
												className={`rounded-xl border p-3 ${
													CHECK_STYLES[check.status] || "border-slate-200 bg-white text-slate-600"
												}`}
											>
												<div className="flex items-center justify-between">
													<span className="font-semibold text-slate-900">
														{check.label || check.field || "Metric"}
													</span>
													<span className="text-xs uppercase tracking-[0.3em]">
														{check.status || "ok"}
													</span>
												</div>
												<p className="mt-2 text-xs text-slate-500">
													Observed: {formatValue(check.value)}
												</p>
												<p className="mt-1 text-xs text-slate-400">{check.detail || "No detail provided."}</p>
											</div>
										))}
									</div>
								) : (
									<p className="mt-3 text-sm text-slate-500">No anomaly checks available.</p>
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
