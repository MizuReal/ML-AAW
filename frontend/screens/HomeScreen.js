import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Modal, TextInput, Image } from 'react-native';
import { supabase } from '../utils/supabaseClient';
import { chatWithGemini } from '../utils/api';

const SUPABASE_PROFILES_TABLE = process.env.EXPO_PUBLIC_SUPABASE_PROFILES_TABLE || 'profiles';
const SUPABASE_SAMPLES_TABLE = process.env.EXPO_PUBLIC_SUPABASE_SAMPLES_TABLE || 'field_samples';

const getInitials = (value) => {
	if (!value) return 'NA';
	const parts = value.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return 'NA';
	const first = parts[0][0] || '';
	const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
	return `${first}${last}`.toUpperCase();
};

const FALLBACK_KEY_METRICS = [
	{
		id: 'potable_rate',
		label: 'Potable rate',
		value: '--',
		caption: 'No saved samples yet',
		badge: 'Waiting for history',
		badgeClass: 'text-emerald-300',
		borderClass: 'border-emerald-500/40',
	},
	{
		id: 'latest_sample',
		label: 'Latest sample',
		value: '--',
		caption: 'No timeline yet',
		badge: 'Upload first sample',
		badgeClass: 'text-sky-300',
		borderClass: 'border-sky-500/40',
	},
	{
		id: 'watchlist',
		label: 'Watchlist',
		value: '0',
		caption: 'Risk watch + unsafe',
		badge: 'No active alerts',
		badgeClass: 'text-amber-300',
		borderClass: 'border-amber-400/40',
	},
	{
		id: 'samples',
		label: 'Saved samples',
		value: '0',
		caption: 'In your history',
		badge: 'Start with Data Input',
		badgeClass: 'text-rose-300',
		borderClass: 'border-rose-400/40',
	},
];

const FALLBACK_CHEMISTRY_CARDS = [
	{
		id: 'ph',
		label: 'pH',
		value: '--',
		descriptor: 'No samples yet',
		change: 'Add readings to trend',
		barWidth: 'w-[72%]',
		barColor: 'bg-emerald-400',
	},
	{
		id: 'turbidity',
		label: 'Turbidity (NTU)',
		value: '--',
		descriptor: 'No samples yet',
		change: 'Add readings to trend',
		barWidth: 'w-[30%]',
		barColor: 'bg-sky-400',
	},
	{
		id: 'conductivity',
		label: 'Conductivity',
		value: '--',
		descriptor: 'No samples yet',
		change: 'Add readings to trend',
		barWidth: 'w-[55%]',
		barColor: 'bg-amber-300',
	},
	{
		id: 'hardness',
		label: 'Hardness',
		value: '--',
		descriptor: 'No samples yet',
		change: 'Add readings to trend',
		barWidth: 'w-[65%]',
		barColor: 'bg-purple-300',
	},
];

const average = (values = []) => {
	if (!values.length) return null;
	const sum = values.reduce((acc, value) => acc + value, 0);
	return sum / values.length;
};

const formatCompactElapsed = (timestamp) => {
	if (!timestamp) return '--';
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return '--';
	const diffMs = Date.now() - date.getTime();
	const minutes = Math.max(0, Math.floor(diffMs / 60000));
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
};

const formatMetricValue = (value, digits = 2) => {
	if (!Number.isFinite(value)) return '--';
	return Number(value).toFixed(digits);
};

const formatDeltaLabel = (latest, avgValue, suffix = '') => {
	if (!Number.isFinite(latest) || !Number.isFinite(avgValue)) {
		return 'Insufficient trend data';
	}
	const delta = latest - avgValue;
	const sign = delta >= 0 ? '+' : '-';
	return `${sign}${Math.abs(delta).toFixed(2)} vs recent avg${suffix}`;
};

const TASKS = [
	{
		id: 'calibration',
		title: 'Calibrate delta probes',
		detail: 'Last run 36h ago - assign to lab 02',
		state: 'Due soon',
		stateClass: 'text-amber-300',
	},
	{
		id: 'imaging',
		title: 'Review image anomalies',
		detail: 'Irrigation canal batch has 2 new flags',
		state: 'Focus',
		stateClass: 'text-rose-300',
	},
	{
		id: 'policy',
		title: 'Update compliance brief',
		detail: 'Align daily log format with WHO draft',
		state: 'In progress',
		stateClass: 'text-sky-300',
	},
];

const CHAT_TABS = [
	{ id: 'quality', label: 'Ask about water quality' },
	{ id: 'data', label: 'Ask about my data' },
];

const DATA_SCOPE_HINT =
	'I can help with your saved water data: sample history, trends, risk levels, confidence, and parameter patterns.';
const QUALITY_SCOPE_HINT =
	'I can help with water-quality topics like pH, turbidity, hardness, conductivity, contamination risk, and interpretation.';

const containsKeyword = (text = '', keywords = []) => {
	const lower = text.toLowerCase();
	return keywords.some((keyword) => lower.includes(keyword));
};

const isAllowedDataPrompt = (text = '') => Boolean(text && text.trim().length > 0);

const isAllowedQualityPrompt = (text = '') => {
	const qualityKeywords = [
		'water',
		'quality',
		'potable',
		'non-potable',
		'ph',
		'turbidity',
		'conductivity',
		'hardness',
		'chlorine',
		'contamination',
		'bacteria',
		'microbial',
		'safe',
		'unsafe',
		'parameter',
		'pollution',
		'who',
	];
	return containsKeyword(text, qualityKeywords);
};

const HomeScreen = ({ onNavigate }) => {
  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
	const [chatOpen, setChatOpen] = useState(false);
	const [activeChatTab, setActiveChatTab] = useState('quality');
	const [chatInput, setChatInput] = useState('');
	const [profileName, setProfileName] = useState('');
	const [avatarUrl, setAvatarUrl] = useState('');
	const [savedSamples, setSavedSamples] = useState([]);
	const [chatLoading, setChatLoading] = useState(false);
	const [keyMetrics, setKeyMetrics] = useState(FALLBACK_KEY_METRICS);
	const [chemistryCards, setChemistryCards] = useState(FALLBACK_CHEMISTRY_CARDS);
	const [clusterRiskLabel, setClusterRiskLabel] = useState('No data');
	const [clusterIndexLabel, setClusterIndexLabel] = useState('Composite index pending');
	const [clusterBarPercent, setClusterBarPercent] = useState(8);
	const [chatThreads, setChatThreads] = useState({
		quality: [
			{
				id: 'quality-1',
				role: 'assistant',
				text: QUALITY_SCOPE_HINT,
			},
		],
		data: [
			{
				id: 'data-1',
				role: 'assistant',
				text: DATA_SCOPE_HINT,
			},
		],
	});

	const appendAssistantMessage = (threadKey, text) => {
		const timestamp = Date.now();
		setChatThreads((prev) => {
			const thread = prev[threadKey] || [];
			return {
				...prev,
				[threadKey]: [
					...thread,
					{ id: `${threadKey}-assistant-${timestamp}`, role: 'assistant', text },
				],
			};
		});
	};

	const handleSendChat = async () => {
		const trimmed = chatInput.trim();
		if (!trimmed || chatLoading) {
			return;
		}
		const threadKey = activeChatTab === 'quality' ? 'quality' : 'data';
		const timestamp = Date.now();
		const userEntry = { id: `${threadKey}-user-${timestamp}`, role: 'user', text: trimmed };

		setChatThreads((prev) => {
			const thread = prev[threadKey] || [];
			return {
				...prev,
				[threadKey]: [...thread, userEntry],
			};
		});

		setChatInput('');

		const allowed =
			threadKey === 'quality' ? isAllowedQualityPrompt(trimmed) : isAllowedDataPrompt(trimmed);

		if (!allowed) {
			const message =
				threadKey === 'quality'
					? 'I can help with water-related questions only in this tab. Please ask about water quality, safety, or water parameters.'
					: 'I can help with your saved data in this tab. Ask any question about your recent records, trends, or results.';
			appendAssistantMessage(threadKey, message);
			return;
		}

		const scopePrefix = threadKey === 'quality' ? 'Water quality' : "Users' data";
		const scopedPrompt = `${scopePrefix} + ${trimmed}`;
		const threadSnapshot = [
			...(chatThreads[threadKey] || []).map((message) => ({
				role: message.role,
				text:
					message.role === 'user'
						? `${scopePrefix} + ${message.text}`
						: message.text,
			})),
			{ role: 'user', text: scopedPrompt },
		];

		setChatLoading(true);

		try {
			const qualityContext = {
				tab: 'quality',
				scope: 'water_quality_only',
				rule: 'Reject anything unrelated to water quality.',
				clusterRisk: clusterRiskLabel,
				clusterIndex: clusterIndexLabel,
				keyMetrics,
				chemistryCards,
			};

			const userDataContext = {
				tab: 'users_data',
				scope: 'user_saved_samples_only',
				rule: 'Reject requests outside saved user water-sample context.',
				sampleCount: savedSamples.length,
				samples: savedSamples.slice(0, 20).map((row) => ({
					id: row?.id,
					created_at: row?.created_at,
					source: row?.source,
					prediction_is_potable: row?.prediction_is_potable,
					prediction_probability: row?.prediction_probability,
					risk_level: row?.risk_level,
					ph: row?.ph,
					turbidity: row?.turbidity,
					conductivity: row?.conductivity,
					hardness: row?.hardness,
				})),
			};

			const analysisPayload = threadKey === 'quality' ? qualityContext : userDataContext;
			const response = await chatWithGemini(analysisPayload, threadSnapshot, scopedPrompt);
			appendAssistantMessage(
				threadKey,
				response?.reply || 'No response generated. Please try rephrasing within the allowed scope.'
			);
		} catch (error) {
			appendAssistantMessage(
				threadKey,
				`Error: ${error?.message || 'Chat request failed'}`
			);
		} finally {
			setChatLoading(false);
		}
	};

	const metricRows = useMemo(() => {
		const rows = [];
		for (let i = 0; i < keyMetrics.length; i += 2) {
			rows.push(keyMetrics.slice(i, i + 2));
		}
		return rows;
	}, [keyMetrics]);

	const chemistryRows = useMemo(() => {
		const rows = [];
		for (let i = 0; i < chemistryCards.length; i += 2) {
			rows.push(chemistryCards.slice(i, i + 2));
		}
		return rows;
	}, [chemistryCards]);

	useEffect(() => {
		Animated.parallel([
			Animated.timing(heroAnim, {
				toValue: 1,
				duration: 500,
				delay: 80,
				useNativeDriver: true,
			}),
			Animated.timing(cardsAnim, {
				toValue: 1,
				duration: 500,
				delay: 220,
				useNativeDriver: true,
			}),
		]).start();
	}, [heroAnim, cardsAnim]);

	useEffect(() => {
		let isMounted = true;

		const loadOverview = async () => {
			try {
				const sessionResult = await supabase.auth.getSession();
				const user = sessionResult?.data?.session?.user || null;
				if (!user) {
					if (isMounted) {
						setProfileName('');
						setAvatarUrl('');
						setKeyMetrics(FALLBACK_KEY_METRICS);
						setChemistryCards(FALLBACK_CHEMISTRY_CARDS);
						setClusterRiskLabel('No data');
						setClusterIndexLabel('Composite index pending');
						setClusterBarPercent(8);
					}
					return;
				}

				const [profileResult, samplesResult] = await Promise.all([
					supabase
						.from(SUPABASE_PROFILES_TABLE)
						.select('display_name, avatar_url')
						.eq('id', user.id)
						.single(),
					supabase
						.from(SUPABASE_SAMPLES_TABLE)
						.select('id, created_at, source, ph, turbidity, conductivity, hardness, prediction_is_potable, prediction_probability, risk_level')
						.eq('user_id', user.id)
						.order('created_at', { ascending: false })
						.limit(40),
				]);

				if (profileResult.error && profileResult.error.code !== 'PGRST116') {
					console.warn('[Supabase] profile fetch failed:', profileResult.error.message || profileResult.error);
				}

				if (samplesResult.error) {
					console.warn('[Supabase] overview sample fetch failed:', samplesResult.error.message || samplesResult.error);
				}

				const samples = samplesResult.data || [];
				setSavedSamples(samples);
				const totalSamples = samples.length;
				const now = Date.now();
				const dayAgo = now - 24 * 60 * 60 * 1000;
				const recent24h = samples.filter((row) => {
					const ts = row?.created_at ? new Date(row.created_at).getTime() : 0;
					return ts >= dayAgo;
				}).length;
				const potableCount = samples.filter((row) => row?.prediction_is_potable === true).length;
				const watchCount = samples.filter((row) => {
					const risk = (row?.risk_level || '').toLowerCase();
					return risk === 'watch' || risk === 'unsafe';
				}).length;
				const confidenceValues = samples
					.map((row) => row?.prediction_probability)
					.filter((value) => Number.isFinite(value));
				const avgConfidence = average(confidenceValues);
				const latestSample = samples[0] || null;
				const phValues = samples.map((row) => row?.ph).filter((value) => Number.isFinite(value));
				const turbidityValues = samples.map((row) => row?.turbidity).filter((value) => Number.isFinite(value));
				const conductivityValues = samples.map((row) => row?.conductivity).filter((value) => Number.isFinite(value));
				const hardnessValues = samples.map((row) => row?.hardness).filter((value) => Number.isFinite(value));
				const phAvg = average(phValues);
				const turbidityAvg = average(turbidityValues);
				const conductivityAvg = average(conductivityValues);
				const hardnessAvg = average(hardnessValues);

				const dynamicKeyMetrics = [
					{
						id: 'potable_rate',
						label: 'Potable rate',
						value: totalSamples ? `${Math.round((potableCount / totalSamples) * 100)}%` : '--',
						caption: totalSamples ? `${potableCount}/${totalSamples} marked potable` : 'No saved samples yet',
						badge: totalSamples ? `${recent24h} in last 24h` : 'Waiting for history',
						badgeClass: 'text-emerald-300',
						borderClass: 'border-emerald-500/40',
					},
					{
						id: 'latest_sample',
						label: 'Latest sample',
						value: latestSample?.created_at ? formatCompactElapsed(latestSample.created_at) : '--',
						caption: latestSample?.source || 'No timeline yet',
						badge:
							Number.isFinite(avgConfidence) && avgConfidence >= 0
								? `Avg confidence ${(avgConfidence * 100).toFixed(0)}%`
								: 'Confidence pending',
						badgeClass: 'text-sky-300',
						borderClass: 'border-sky-500/40',
					},
					{
						id: 'watchlist',
						label: 'Watchlist',
						value: `${watchCount}`,
						caption: 'Risk watch + unsafe',
						badge: watchCount ? 'Review flagged samples' : 'No active alerts',
						badgeClass: 'text-amber-300',
						borderClass: 'border-amber-400/40',
					},
					{
						id: 'samples',
						label: 'Saved samples',
						value: `${totalSamples}`,
						caption: 'In your history',
						badge: totalSamples ? 'Synced from Data Input' : 'Start with Data Input',
						badgeClass: 'text-rose-300',
						borderClass: 'border-rose-400/40',
					},
				];

				const dynamicChemistryCards = [
					{
						id: 'ph',
						label: 'pH',
						value: formatMetricValue(phAvg),
						descriptor: 'Recent average',
						change: formatDeltaLabel(latestSample?.ph, phAvg),
						barWidth: 'w-[72%]',
						barColor: 'bg-emerald-400',
					},
					{
						id: 'turbidity',
						label: 'Turbidity (NTU)',
						value: formatMetricValue(turbidityAvg),
						descriptor: 'Recent average',
						change: formatDeltaLabel(latestSample?.turbidity, turbidityAvg),
						barWidth: 'w-[30%]',
						barColor: 'bg-sky-400',
					},
					{
						id: 'conductivity',
						label: 'Conductivity',
						value: Number.isFinite(conductivityAvg) ? `${Number(conductivityAvg).toFixed(0)} uS/cm` : '--',
						descriptor: 'Recent average',
						change: formatDeltaLabel(latestSample?.conductivity, conductivityAvg),
						barWidth: 'w-[55%]',
						barColor: 'bg-amber-300',
					},
					{
						id: 'hardness',
						label: 'Hardness',
						value: formatMetricValue(hardnessAvg),
						descriptor: 'Recent average',
						change: formatDeltaLabel(latestSample?.hardness, hardnessAvg),
						barWidth: 'w-[65%]',
						barColor: 'bg-purple-300',
					},
				];

				const safeRatio = totalSamples ? potableCount / totalSamples : 0;
				const riskLabel =
					totalSamples === 0
						? 'No data'
						: safeRatio >= 0.8
							? 'Low risk'
							: safeRatio >= 0.5
								? 'Moderate risk'
								: 'High risk';
				const riskIndex = totalSamples ? 1 - safeRatio : 0;
				const boundedRiskIndex = Math.max(0, Math.min(1, riskIndex));
				const progressPercent = Math.round((1 - boundedRiskIndex) * 100);

				if (isMounted) {
					setProfileName(profileResult.data?.display_name || user.email || '');
					setAvatarUrl(profileResult.data?.avatar_url || '');
					setKeyMetrics(dynamicKeyMetrics);
					setChemistryCards(dynamicChemistryCards);
					setClusterRiskLabel(riskLabel);
					setClusterIndexLabel(
						totalSamples
							? `Composite index ${boundedRiskIndex.toFixed(2)} from ${totalSamples} samples`
							: 'Composite index pending'
					);
					setClusterBarPercent(Math.max(8, progressPercent));
				}
			} catch (error) {
				console.warn('[Supabase] overview fetch error:', error?.message || error);
				if (isMounted) {
					setSavedSamples([]);
				}
			}
		};

		loadOverview();

		return () => {
			isMounted = false;
		};
	}, []);

	const currentThread = chatThreads[activeChatTab === 'quality' ? 'quality' : 'data'] || [];

	return (
		<View className="flex-1 bg-aquadark">
			<ScrollView
				className="px-5 pt-10"
				contentContainerClassName="pb-20 gap-6"
				showsVerticalScrollIndicator={false}
			>
				<Animated.View
					style={{
						opacity: heroAnim,
						transform: [
							{
								translateY: heroAnim.interpolate({
									inputRange: [0, 1],
									outputRange: [24, 0],
								}),
							},
						],
					}}
					className="rounded-[34px] border border-sky-900/70 bg-gradient-to-br from-slate-950/90 via-sky-950/40 to-emerald-900/20 px-5 pb-6 pt-7"
				>
					<View className="flex-row items-start justify-between">
						<View className="max-w-[70%]">
							<Text className="text-[11px] uppercase tracking-[3px] text-sky-400">
								Lake Biwa cluster
							</Text>
							<Text className="mt-2 text-[22px] font-semibold text-sky-50">
								Operations pulse
							</Text>
							<Text className="mt-1 text-[12px] text-slate-400">
								Updated 09:41 UTC
							</Text>
						</View>
						<View className="items-end">
							<View className="rounded-full border border-slate-800/70 bg-slate-950/70 px-4 py-1">
								<Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
									Ops Live
								</Text>
							</View>
						</View>
					</View>

					<View className="mt-5 items-center">
						<View className="h-20 w-20 overflow-hidden rounded-[26px] border border-sky-800/70 bg-slate-950/70">
							{avatarUrl ? (
								<Image
									source={{ uri: avatarUrl }}
									className="h-full w-full"
									resizeMode="cover"
								/>
							) : (
								<View className="h-full w-full items-center justify-center">
									<Text className="text-[22px] font-semibold text-sky-50">
										{getInitials(profileName)}
									</Text>
								</View>
							)}
						</View>
						<Text
							className="mt-3 max-w-[90%] text-[17px] font-semibold text-sky-50"
							numberOfLines={1}
						>
							{profileName || 'Field operator'}
						</Text>
						<Text className="text-[12px] text-slate-400">Field intelligence lead</Text>
					</View>

					<View className="mt-5 rounded-2xl border border-sky-900/60 bg-slate-950/60 px-4 py-3">
						<Text className="text-[12px] uppercase tracking-wide text-sky-300">
							Cluster health
						</Text>
						<View className="mt-2 flex-row items-start justify-between gap-3">
							<View className="flex-1 min-w-0">
								<Text className="text-[28px] font-semibold text-emerald-200">
									{clusterRiskLabel}
								</Text>
								<Text className="text-[13px] text-slate-400" numberOfLines={2}>
									{clusterIndexLabel}
								</Text>
							</View>
							<TouchableOpacity
								activeOpacity={0.85}
								className="shrink-0 rounded-full border border-aquaaccent/60 bg-aquaaccent/10 px-4 py-2"
							>
								<Text className="text-[12px] font-semibold text-aquaaccent">
									Sync sensors
								</Text>
							</TouchableOpacity>
						</View>
						<View className="mt-3 h-1.5 w-full rounded-full bg-slate-900">
							<View
								className="h-full rounded-full bg-emerald-400"
								style={{ width: `${clusterBarPercent}%` }}
							/>
						</View>
						<Text className="mt-2 text-[11px] text-slate-400">
							Based on turbidity, conductivity, imaging anomalies, and pathogen scan delta.
						</Text>
					</View>

					<Animated.View
						style={{
							opacity: heroAnim,
							transform: [
								{
									translateY: heroAnim.interpolate({
										inputRange: [0, 1],
										outputRange: [12, 0],
									}),
								},
							],
						}}
						className="mt-4 rounded-[28px] border border-aquaaccent/40 bg-slate-950/80 p-4"
					>
						<View className="flex-row items-center justify-between">
							<View className="max-w-[70%]">
								<Text className="text-[12px] uppercase tracking-wide text-sky-300">
									WaterOps Copilot
								</Text>
								<Text className="mt-1 text-[13px] text-slate-300">
									Tap to brief our assistant on quality signals or your latest uploads.
								</Text>
							</View>
							<View className="rounded-full border border-slate-800/70 px-3 py-1">
								<Text className="text-[11px] font-semibold text-slate-300">Beta</Text>
							</View>
						</View>
						<TouchableOpacity
							activeOpacity={0.85}
							className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3"
							onPress={() => {
								setChatOpen(true);
							}}
						>
							<Text className="text-[12px] text-slate-400">
								Ask about stability windows, anomaly triage, or summarized data pulses...
							</Text>
							<View className="mt-3 flex-row flex-wrap gap-2">
								{CHAT_TABS.map((tab) => (
									<View
										key={tab.id}
										className="rounded-full border border-slate-800/70 px-3 py-1"
									>
										<Text className="text-[11px] text-slate-300" numberOfLines={1}>{tab.label}</Text>
									</View>
								))}
							</View>
						</TouchableOpacity>
					</Animated.View>
				</Animated.View>

				<Animated.View
					style={{
						opacity: cardsAnim,
						transform: [
							{
								translateY: cardsAnim.interpolate({
									inputRange: [0, 1],
									outputRange: [18, 0],
								}),
							},
						],
					}}
					className="gap-4"
				>
					{metricRows.map((row) => (
						<View key={row[0].id} className="flex-row gap-3">
							{row.map((metric) => (
								<View
									key={metric.id}
									className={`flex-1 min-w-0 rounded-3xl border ${metric.borderClass} bg-slate-950/60 p-4`}
								>
									<Text className="text-[12px] uppercase tracking-wide text-slate-400" numberOfLines={1}>
										{metric.label}
									</Text>
									<View className="mt-3 flex-row items-end justify-between gap-2">
										<Text className="shrink text-[26px] font-semibold text-sky-50" numberOfLines={1}>
											{metric.value}
										</Text>
										<Text className="max-w-[58%] text-right text-[11px] text-slate-400" numberOfLines={2}>
											{metric.caption}
										</Text>
									</View>
									<Text className={`mt-3 text-[12px] font-semibold ${metric.badgeClass}`} numberOfLines={1}>
										{metric.badge}
									</Text>
								</View>
							))}
						</View>
					))}
				</Animated.View>

				<View className="gap-3">
					{chemistryRows.map((row, rowIndex) => (
						<View key={`${row[0].id}-${rowIndex}`} className="flex-row gap-3">
							{row.map((card) => (
								<View
									key={card.id}
									className="flex-1 min-w-0 rounded-3xl border border-sky-900/70 bg-slate-950/70 p-4"
								>
									<Text className="text-[12px] uppercase tracking-wide text-sky-300">
										{card.label}
									</Text>
									<Text className="mt-2 text-[20px] font-semibold text-sky-50" numberOfLines={1}>
										{card.value}
									</Text>
									<Text className="text-[12px] text-slate-400" numberOfLines={1}>{card.descriptor}</Text>
									<Text className="mt-1 text-[11px] text-slate-500" numberOfLines={2}>{card.change}</Text>
									<View className="mt-3 h-1.5 w-full rounded-full bg-slate-900">
										<View className={`h-full rounded-full ${card.barWidth} ${card.barColor}`} />
									</View>
								</View>
							))}
						</View>
					))}
				</View>

				<View className="rounded-3xl border border-emerald-600/40 bg-emerald-900/10 p-5">
					<Text className="text-[12px] uppercase tracking-wide text-emerald-300">
						Image insights
					</Text>
					<Text className="mt-2 text-[14px] text-slate-200">
						No anomalies detected in last microscopy run. Dusk captures share 96 percent match with healthy baseline.
					</Text>
					<Text className="mt-2 text-[11px] text-slate-400">
						Next auto-ingest window starts 12:30 UTC. Confirm glare mask before batch uploads.
					</Text>
				</View>

				<View className="rounded-3xl border border-sky-900/70 bg-slate-950/80 p-5">
					<View className="flex-row items-center justify-between">
						<Text className="text-[13px] uppercase tracking-wide text-sky-300">
							Action queue
						</Text>
						<Text className="text-[12px] text-slate-400">Updated 5m ago</Text>
					</View>
					{TASKS.map((task) => (
						<View
							key={task.id}
							className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3"
						>
							<View className="flex-row items-center justify-between gap-2">
								<Text className="flex-1 text-[15px] font-semibold text-sky-50" numberOfLines={1}>
									{task.title}
								</Text>
								<Text className={`shrink-0 text-[12px] font-semibold ${task.stateClass}`} numberOfLines={1}>
									{task.state}
								</Text>
							</View>
							<Text className="mt-1 text-[12px] text-slate-400" numberOfLines={2}>{task.detail}</Text>
						</View>
					))}
				</View>

			</ScrollView>

			<Modal
				visible={chatOpen}
				animationType="fade"
				transparent
				onRequestClose={() => setChatOpen(false)}
			>
				<View className="flex-1 bg-black/70 px-5 py-10">
					<View className="flex-1 justify-center">
						<View className="max-h-[80%] rounded-[32px] border border-sky-900/80 bg-slate-950/95 p-5">
							<View className="flex-row items-center justify-between">
								<View>
									<Text className="text-[16px] font-semibold text-sky-50">
										WaterOps Copilot
									</Text>
									<Text className="text-[12px] text-slate-400">
										Conversational assistant
									</Text>
								</View>
								<TouchableOpacity
									activeOpacity={0.8}
									onPress={() => setChatOpen(false)}
									className="h-10 w-10 items-center justify-center rounded-full border border-slate-800/70"
								>
									<Text className="text-[16px] font-semibold text-sky-100">X</Text>
								</TouchableOpacity>
							</View>

							<View className="mt-4 flex-row rounded-full border border-slate-800/80 bg-slate-900/60 p-1">
								{CHAT_TABS.map((tab) => {
									const selected = activeChatTab === tab.id;
									return (
										<TouchableOpacity
											key={tab.id}
											activeOpacity={0.85}
											className={`flex-1 rounded-full px-3 py-1.5 ${
												selected ? 'bg-aquaaccent/20' : 'bg-transparent'
											}`}
											onPress={() => setActiveChatTab(tab.id)}
										>
											<Text
												className={`text-center text-[12px] font-semibold ${
													selected ? 'text-aquaaccent' : 'text-slate-300'
												}`}
												numberOfLines={1}
											>
												{tab.label}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>

							<ScrollView
								className="mt-5"
								contentContainerClassName="gap-3 pb-4"
								showsVerticalScrollIndicator={false}
								style={{ maxHeight: 320 }}
							>
								{currentThread.map((message) => {
									const isUser = message.role === 'user';
									return (
										<View
											key={message.id}
											className={`max-w-[85%] rounded-2xl px-4 py-3 ${
												isUser
													? 'self-end bg-aquaaccent/20 border border-aquaaccent/40'
												: 'self-start border border-slate-800/80 bg-slate-900/80'
											}`}
										>
											<Text className="text-[13px] text-sky-50">{message.text}</Text>
										</View>
									);
								})}
								{chatLoading && (
									<View className="max-w-[85%] self-start rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3">
										<Text className="text-[13px] text-slate-300">Thinking...</Text>
									</View>
								)}
							</ScrollView>

							<View className="mt-4 flex-row items-center gap-3">
								<TextInput
									className="flex-1 rounded-2xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sky-100"
									placeholder="Write a prompt..."
									placeholderTextColor="#94a3b8"
									value={chatInput}
									onChangeText={setChatInput}
									multiline
									style={{ maxHeight: 100 }}
								/>
								<TouchableOpacity
									activeOpacity={0.85}
									className={`rounded-2xl border border-aquaaccent/60 px-4 py-3 ${chatLoading ? 'bg-slate-700' : 'bg-aquaaccent/80'}`}
									onPress={handleSendChat}
									disabled={chatLoading}
								>
									<Text className={`text-[13px] font-semibold ${chatLoading ? 'text-slate-300' : 'text-slate-950'}`}>
										{chatLoading ? 'Sending' : 'Send'}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</Modal>

		</View>
	);
};

export default HomeScreen;
