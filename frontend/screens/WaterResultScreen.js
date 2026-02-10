import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_WIDTH = Math.min(SCREEN_WIDTH - 80, 280);

/** Error boundary so a crash inside MicrobialRiskSection never hides the whole result screen. */
class MicrobialErrorBoundary extends React.Component {
	state = { hasError: false };
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	componentDidCatch(error, info) {
		console.warn('[MicrobialRiskSection] render error:', error, info);
	}
	render() {
		if (this.state.hasError) {
			return (
				<View className="mt-6 rounded-[28px] border border-rose-500/30 bg-rose-500/5 p-5">
					<Text className="text-[12px] font-semibold text-rose-300">
						Microbial risk data is available but could not be rendered.
					</Text>
					<Text className="text-[10px] text-rose-400/60 mt-1">
						Check the console for details.
					</Text>
				</View>
			);
		}
		return this.props.children;
	}
}

const CONFIDENCE_ANIMATIONS = {
	low: require('../assets/public/not.json'),
	medium: require('../assets/public/warning.json'),
	high: require('../assets/public/yes.json'),
};

const getConfidenceAnimation = (probability = 0) => {
	const p = Number.isFinite(probability) ? probability : 0;
	if (p < 0.5) return CONFIDENCE_ANIMATIONS.low; // < 50%
	if (p < 0.7) return CONFIDENCE_ANIMATIONS.medium; // 50–70%
	return CONFIDENCE_ANIMATIONS.high; // > 70%
};

const ConfidenceGauge = ({ probability, threshold = 0.5 }) => {
	const percentage = Math.round(probability * 100);
	const thresholdPos = threshold * 100;
	const isAboveThreshold = probability >= threshold;
	
	const getConfidenceLevel = (prob) => {
		if (prob >= 0.85) return { label: 'High', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
		if (prob >= 0.65) return { label: 'Moderate', color: 'bg-sky-500', textColor: 'text-sky-400' };
		if (prob >= 0.5) return { label: 'Low', color: 'bg-amber-500', textColor: 'text-amber-400' };
		return { label: 'Very Low', color: 'bg-rose-500', textColor: 'text-rose-400' };
	};
	
	const confidence = getConfidenceLevel(probability);
	
	const segments = [
		{ range: [0, 50], color: 'bg-rose-500/30', activeColor: 'bg-rose-500' },
		{ range: [50, 65], color: 'bg-amber-500/30', activeColor: 'bg-amber-500' },
		{ range: [65, 85], color: 'bg-sky-500/30', activeColor: 'bg-sky-500' },
		{ range: [85, 100], color: 'bg-emerald-500/30', activeColor: 'bg-emerald-500' },
	];

	return (
		<View className="mt-4">
			<View className="flex-row items-center justify-between mb-2">
				<Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
					Model Confidence
				</Text>
				<View className="flex-row items-center gap-1.5">
					<View className={`w-2 h-2 rounded-full ${confidence.color}`} />
					<Text className={`text-[11px] font-semibold ${confidence.textColor}`}>
						{confidence.label}
					</Text>
				</View>
			</View>
			
			{/* Gauge Bar */}
			<View className="h-3 rounded-full bg-slate-800 overflow-hidden flex-row">
				{segments.map((seg, i) => {
					const segWidth = seg.range[1] - seg.range[0];
					const fillWidth = Math.max(0, Math.min(percentage - seg.range[0], segWidth));
					const fillPercent = (fillWidth / segWidth) * 100;
					return (
						<View 
							key={i} 
							className={`h-full ${seg.color}`} 
							style={{ width: `${segWidth}%` }}
						>
							{fillPercent > 0 && (
								<View 
									className={`h-full ${seg.activeColor}`} 
									style={{ width: `${fillPercent}%` }} 
								/>
							)}
						</View>
					);
				})}
			</View>
			
			{/* Scale Labels */}
			<View className="flex-row justify-between mt-1.5">
				<Text className="text-[9px] text-slate-600">0%</Text>
				<Text className="text-[9px] text-slate-500">50%</Text>
				<Text className="text-[9px] text-slate-600">100%</Text>
			</View>
			
			{/* Confidence Value */}
			<View className="items-center mt-3">
				<Text className="text-[32px] font-bold text-slate-50">{percentage}%</Text>
				<Text className="text-[11px] text-slate-400 mt-0.5">
					{isAboveThreshold ? 'Above' : 'Below'} decision threshold ({Math.round(thresholdPos)}%)
				</Text>
			</View>
			
			{/* Confidence Breakdown */}
			<View className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
				<Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
					Prediction Analysis
				</Text>
				<View className="gap-2">
					<ConfidenceMetric 
						label="Certainty" 
						value={Math.abs(probability - 0.5) * 2} 
						description="Distance from uncertainty"
					/>
					<ConfidenceMetric 
						label="Margin" 
						value={Math.abs(probability - threshold)} 
						description="Buffer from threshold"
					/>
					<ConfidenceMetric 
						label="Reliability" 
						value={probability >= 0.5 ? probability : 1 - probability} 
						description="Prediction strength"
					/>
				</View>
			</View>
		</View>
	);
};

const ConfidenceMetric = ({ label, value, description }) => {
	const percentage = Math.round(value * 100);
	const getBarColor = (val) => {
		if (val >= 0.4) return 'bg-emerald-500';
		if (val >= 0.2) return 'bg-amber-500';
		return 'bg-rose-500';
	};
	
	return (
		<View className="flex-row items-center gap-3">
			<View className="w-16">
				<Text className="text-[10px] font-medium text-slate-300">{label}</Text>
			</View>
			<View className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
				<View 
					className={`h-full rounded-full ${getBarColor(value)}`} 
					style={{ width: `${percentage}%` }} 
				/>
			</View>
			<Text className="text-[10px] text-slate-400 w-8 text-right">{percentage}%</Text>
		</View>
	);
};

const riskBadgeStyles = {
	safe: {
		container: 'border-emerald-500/40 bg-emerald-500/10',
		text: 'text-emerald-100',
	},
	borderline: {
		container: 'border-amber-400/40 bg-amber-400/10',
		text: 'text-amber-50',
	},
	watch: {
		container: 'border-orange-400/40 bg-orange-500/10',
		text: 'text-orange-100',
	},
	unsafe: {
		container: 'border-rose-500/60 bg-rose-500/10',
		text: 'text-rose-100',
	},
	default: {
		container: 'border-slate-700 bg-slate-800/60',
		text: 'text-slate-200',
	},
};

const parameterSeverityStyles = {
	ok: {
		container: 'border-emerald-500/30 bg-emerald-500/5',
		badge: 'text-emerald-200',
	},
	warning: {
		container: 'border-amber-400/40 bg-amber-500/10',
		badge: 'text-amber-200',
	},
	critical: {
		container: 'border-rose-500/60 bg-rose-500/10',
		badge: 'text-rose-200',
	},
	missing: {
		container: 'border-slate-800 bg-slate-900/60',
		badge: 'text-slate-400',
	},
	default: {
		container: 'border-slate-800 bg-slate-900/60',
		badge: 'text-slate-400',
	},
};

const formatNumericValue = (value) => {
	if (value === undefined || value === null) {
		return '--';
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return '--';
	}
	return parsed.toFixed(2);
};

const formatRecommendedRange = (range) => {
	if (!Array.isArray(range) || range.length !== 2) {
		return 'range unavailable';
	}
	const [low, high] = range.map((value) => Number(value));
	if (!Number.isFinite(low) || !Number.isFinite(high)) {
		return 'range unavailable';
	}
	return `${low.toFixed(2)} - ${high.toFixed(2)}`;
};

const parameterGroupMeta = {
	core: {
		title: 'Core parameters',
		fields: ['pH', 'hardness', 'solids', 'conductivity'],
	},
	chemical: {
		title: 'Chemical compounds',
		fields: ['chloramines', 'sulfate', 'organic_carbon', 'trihalomethanes'],
	},
	physical: {
		title: 'Physical & disinfectant',
		fields: ['turbidity', 'free_chlorine_residual'],
	},
};

const normalizeFieldKey = (field = '') => field.toLowerCase();

const microbialRiskStyles = {
	high: {
		container: 'border-rose-500/60 bg-rose-500/10',
		badge: 'bg-rose-500/20',
		text: 'text-rose-100',
		badgeText: 'text-rose-300',
		icon: '🔴',
		barColor: 'bg-rose-500',
		summaryBg: 'bg-rose-900/60',
		summaryBorder: 'border-rose-500/30',
	},
	medium: {
		container: 'border-amber-400/40 bg-amber-400/10',
		badge: 'bg-amber-500/20',
		text: 'text-amber-100',
		badgeText: 'text-amber-300',
		icon: '🟡',
		barColor: 'bg-amber-500',
		summaryBg: 'bg-amber-900/60',
		summaryBorder: 'border-amber-500/30',
	},
	low: {
		container: 'border-emerald-500/40 bg-emerald-500/10',
		badge: 'bg-emerald-500/20',
		text: 'text-emerald-100',
		badgeText: 'text-emerald-300',
		icon: '🟢',
		barColor: 'bg-emerald-500',
		summaryBg: 'bg-emerald-900/60',
		summaryBorder: 'border-emerald-500/30',
	},
};

const FIELD_DISPLAY_NAMES = {
	ph: 'pH',
	hardness: 'Hardness',
	solids: 'Total Dissolved Solids',
	chloramines: 'Chloramines',
	sulfate: 'Sulfate',
	conductivity: 'Conductivity',
	organic_carbon: 'Organic Carbon (TOC)',
	trihalomethanes: 'Trihalomethanes',
	turbidity: 'Turbidity',
};

const RISK_SUMMARIES = {
	high: 'Multiple WHO thresholds exceeded. Elevated likelihood of pathogenic microbial contamination. Confirmatory lab testing strongly recommended.',
	medium: 'Some WHO thresholds exceeded. Moderate microbial contamination indicators present. Monitoring and follow-up testing advised.',
	low: 'Parameters are within acceptable ranges. Low microbial contamination risk based on current readings.',
};

/** Build a frequency map: bacterium → list of source parameter names */
const buildBacteriaFrequency = (violations) => {
	const freq = {};
	for (const v of violations) {
		for (const b of v.bacteria || []) {
			if (!freq[b]) freq[b] = [];
			freq[b].push(v.field);
		}
	}
	// Sort by number of sources (most cross-referenced first)
	return Object.entries(freq).sort((a, b) => b[1].length - a[1].length);
};

const MicrobialRiskSection = ({ result }) => {
	const riskLevel = result?.microbialRiskLevel || result?.microbial_risk_level;

	// Debug: log to console so we can verify data presence
	console.log('[MicrobialRiskSection] riskLevel:', riskLevel, '| keys:', result ? Object.keys(result).filter(k => k.toLowerCase().includes('microbial') || k.toLowerCase().includes('bacteria')) : 'no result');

	if (!riskLevel) {
		return (
			<View className="mt-6 rounded-[28px] border border-slate-700 bg-slate-900/60 p-5">
				<Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
					Microbial Risk Assessment
				</Text>
				<Text className="text-[11px] text-slate-500">
					Microbial risk data was not returned by the server. Ensure the backend is running the latest code and restart it.
				</Text>
			</View>
		);
	}

	const style = microbialRiskStyles[riskLevel] || microbialRiskStyles.low;
	const violations = result?.microbialViolations || result?.microbial_violations || [];
	const bacteria = result?.possibleBacteria || result?.possible_bacteria || [];
	const probabilities = result?.microbialRiskProbabilities || result?.microbial_risk_probabilities || {};
	const score = result?.microbialScore ?? result?.microbial_score ?? 0;
	const maxScore = result?.microbialMaxScore ?? result?.microbial_max_score ?? 14;
	const bacteriaFreq = buildBacteriaFrequency(violations);

	return (
		<View className="mt-6">
			{/* ─── Risk Header Card ─── */}
			<View className={`rounded-[28px] border p-5 ${style.container}`}>
				<View className="flex-row items-center justify-between mb-1">
					<Text className="text-[13px] font-bold uppercase tracking-[3px] text-slate-300">
						Microbial Risk
					</Text>
					<View className={`rounded-full px-3.5 py-1.5 ${style.badge}`}>
						<Text className={`text-[12px] font-bold uppercase tracking-wide ${style.badgeText}`}>
							{style.icon}  {riskLevel}
						</Text>
					</View>
				</View>

				{/* Summary sentence */}
				<Text className={`mt-2 text-[12px] leading-[18px] ${style.text}`}>
					{RISK_SUMMARIES[riskLevel]}
				</Text>

				{/* Score gauge */}
				<View className="mt-4">
					<View className="flex-row items-center justify-between mb-1.5">
						<Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
							Composite Risk Score
						</Text>
						<Text className="text-[13px] font-bold text-slate-200">{score} / {maxScore}</Text>
					</View>
					<View className="h-3 rounded-full bg-slate-800/80 overflow-hidden flex-row">
						{/* Segmented gauge: green → amber → red */}
						{[
							{ pct: Math.min(score / maxScore, 0.2) / 0.2, color: 'bg-emerald-500', width: 20 },
							{ pct: Math.max(0, Math.min((score / maxScore - 0.2) / 0.2, 1)), color: 'bg-amber-500', width: 20 },
							{ pct: Math.max(0, Math.min((score / maxScore - 0.4) / 0.6, 1)), color: 'bg-rose-500', width: 60 },
						].map((seg, i) => (
							<View key={i} className="h-full bg-slate-800/40" style={{ width: `${seg.width}%` }}>
								{seg.pct > 0 && (
									<View className={`h-full ${seg.color}`} style={{ width: `${Math.min(seg.pct * 100, 100)}%` }} />
								)}
							</View>
						))}
					</View>
					<View className="flex-row justify-between mt-1">
						<Text className="text-[9px] text-emerald-600">Low</Text>
						<Text className="text-[9px] text-amber-600">Medium</Text>
						<Text className="text-[9px] text-rose-600">High</Text>
					</View>
				</View>

				{/* ML class probabilities */}
				{Object.keys(probabilities).length > 0 && (
					<View className="mt-4 rounded-xl border border-slate-800/50 bg-slate-900/50 p-3">
						<Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
							ML Model Prediction
						</Text>
						<View className="gap-2">
							{['low', 'medium', 'high'].map((level) => {
								const prob = probabilities[level] || 0;
								const isSelected = level === riskLevel;
								const barStyle = level === 'high' ? 'bg-rose-500' : level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';
								return (
									<View key={level} className="flex-row items-center gap-2.5">
										<View className="w-[52px] flex-row items-center gap-1">
											{isSelected && <View className={`w-1.5 h-1.5 rounded-full ${barStyle}`} />}
											<Text className={`text-[10px] capitalize ${isSelected ? 'font-bold text-slate-200' : 'text-slate-500'}`}>
												{level}
											</Text>
										</View>
										<View className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
											<View className={`h-full rounded-full ${barStyle} ${isSelected ? 'opacity-100' : 'opacity-40'}`}
												style={{ width: `${Math.round(prob * 100)}%` }}
											/>
										</View>
										<Text className={`text-[11px] w-11 text-right ${isSelected ? 'font-bold text-slate-200' : 'text-slate-500'}`}>
											{Math.round(prob * 100)}%
										</Text>
									</View>
								);
							})}
						</View>
					</View>
				)}
			</View>

			{/* ─── Violations Detail ─── */}
			{violations.length > 0 && (
				<View className="mt-4 rounded-[28px] border border-slate-900 bg-slate-900/70 p-5">
					<Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
						WHO Threshold Violations
					</Text>
					<Text className="text-[10px] text-slate-600 mb-4">
						{violations.length} parameter{violations.length > 1 ? 's' : ''} exceeded safe thresholds
					</Text>

					<View className="gap-3">
						{violations.map((v, i) => {
							const fieldName = FIELD_DISPLAY_NAMES[v.field] || v.field;
							const unit = v.unit || '';
							const weightDots = '●'.repeat(v.weight) + '○'.repeat(3 - Math.min(v.weight, 3));

							return (
								<View key={i} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
									{/* Violation header */}
									<View className="flex-row items-center justify-between px-4 pt-3 pb-2">
										<View className="flex-1">
											<Text className="text-[13px] font-semibold text-slate-100">{fieldName}</Text>
											<Text className="text-[10px] text-slate-500 mt-0.5">{v.rule}</Text>
										</View>
										<View className="items-end">
											<Text className="text-[14px] font-bold text-slate-200">
												{v.value != null ? Number(v.value).toFixed(2) : '—'}
												{unit ? <Text className="text-[10px] font-normal text-slate-500"> {unit}</Text> : null}
											</Text>
											<Text className="text-[9px] text-slate-600 mt-0.5">severity {weightDots}</Text>
										</View>
									</View>

									{/* Health risk & biofilm */}
									{(v.healthRisk || v.health_risk || v.biofilm) ? (
										<View className="px-4 pb-2 gap-1">
											{(v.healthRisk || v.health_risk) ? (
												<View className="flex-row items-start gap-1.5">
													<Text className="text-[10px] text-rose-400 mt-px">⚕</Text>
													<Text className="text-[10px] text-slate-400 flex-1">
														<Text className="text-slate-500 font-semibold">Health risk: </Text>
														{v.healthRisk || v.health_risk}
													</Text>
												</View>
											) : null}
											{v.biofilm ? (
												<View className="flex-row items-start gap-1.5">
													<Text className="text-[10px] text-sky-400 mt-px">◎</Text>
													<Text className="text-[10px] text-slate-400 flex-1">
														<Text className="text-slate-500 font-semibold">Biofilm: </Text>
														{v.biofilm}
													</Text>
												</View>
											) : null}
										</View>
									) : null}

									{/* Bacteria from this violation */}
									{(v.bacteria || []).length > 0 && (
										<View className="px-4 pb-3 pt-1">
											<View className="flex-row flex-wrap gap-1.5">
												{v.bacteria.map((b, j) => (
													<View key={j} className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5">
														<Text className="text-[9px] font-medium text-slate-300 italic">{b}</Text>
													</View>
												))}
											</View>
										</View>
									)}
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* ─── Bacteria Cross-Reference Panel ─── */}
			{bacteriaFreq.length > 0 && (
				<View className="mt-4 rounded-[28px] border border-slate-900 bg-slate-900/70 p-5">
					<Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
						Possible Microbial Concerns
					</Text>
					<Text className="text-[10px] text-slate-600 mb-4">
						{bacteriaFreq.length} organism{bacteriaFreq.length > 1 ? 's' : ''} identified from {violations.length} violation{violations.length > 1 ? 's' : ''}
					</Text>

					<View className="gap-2.5">
						{bacteriaFreq.map(([bacterium, sources], i) => {
							const crossRefCount = sources.length;
							const threatLevel = crossRefCount >= 3 ? 'high' : crossRefCount >= 2 ? 'medium' : 'low';
							const threatColors = {
						high: { border: 'border-rose-500/40', bg: 'bg-rose-500/10', dot: 'bg-rose-500', text: 'text-rose-300' },
						medium: { border: 'border-amber-400/30', bg: 'bg-amber-500/10', dot: 'bg-amber-500', text: 'text-amber-300' },
								low: { border: 'border-slate-700/60', bg: 'bg-slate-900/40', dot: 'bg-slate-500', text: 'text-slate-400' },
							};
							const tc = threatColors[threatLevel];

							return (
								<View key={i} className={`rounded-xl border ${tc.border} ${tc.bg} px-3.5 py-2.5`}>
									<View className="flex-row items-center justify-between">
										<View className="flex-row items-center gap-2 flex-1">
											<View className={`w-2 h-2 rounded-full ${tc.dot}`} />
											<Text className="text-[12px] font-semibold text-slate-200 italic flex-1" numberOfLines={1}>
												{bacterium}
											</Text>
										</View>
										<View className={`rounded-full px-2 py-0.5 bg-slate-800`}>
											<Text className={`text-[9px] font-bold ${tc.text}`}>
												{crossRefCount} source{crossRefCount > 1 ? 's' : ''}
											</Text>
										</View>
									</View>
									<View className="flex-row flex-wrap gap-1 mt-1.5">
										{sources.map((src, j) => (
											<Text key={j} className="text-[9px] text-slate-500 bg-slate-800/60 rounded px-1.5 py-0.5">
												{FIELD_DISPLAY_NAMES[src] || src}
											</Text>
										))}
									</View>
								</View>
							);
						})}
					</View>
				</View>
			)}

			{/* ─── Clean result ─── */}
			{violations.length === 0 && (
				<View className="mt-4 rounded-[28px] border border-emerald-500/20 bg-emerald-500/5 p-5">
					<View className="flex-row items-center gap-2 mb-2">
						<Text className="text-[16px]">✓</Text>
						<Text className="text-[12px] font-semibold text-emerald-200">No Threshold Violations</Text>
					</View>
					<Text className="text-[11px] text-emerald-300/70 leading-[16px]">
						All measured parameters fall within acceptable WHO-derived thresholds for this dataset. 
						Microbial contamination risk is considered low based on the provided readings.
					</Text>
				</View>
			)}
		</View>
	);
};

const WaterResultScreen = ({ visible, onClose, result }) => {
	if (!result) {
		return null;
	}

	const riskStyle = riskBadgeStyles[result.riskLevel] || riskBadgeStyles.default;
	const timestampLabel = result.timestamp
		? new Date(result.timestamp).toLocaleString()
		: 'timestamp pending';
	const missingFeatures = result.missingFeatures || [];
	const groupedChecks = Object.values(parameterGroupMeta).map((group) => ({
		title: group.title,
		checks: (result.checks || []).filter((check) =>
			group.fields.some((field) => normalizeFieldKey(field) === normalizeFieldKey(check.field))
		),
	}));

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={false}
			presentationStyle="fullScreen"
			onRequestClose={onClose}
		>
			<SafeAreaView className="flex-1 bg-slate-950">
				<View className="flex-row items-center justify-between border-b border-slate-900 px-5 py-4">
						<Text className="text-[12px] font-semibold uppercase tracking-[4px] text-slate-400">Potability verdict</Text>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={onClose}
							className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5"
							activeOpacity={0.85}
						>
							<Text className="text-[12px] font-semibold text-slate-100">Close</Text>
						</TouchableOpacity>
					</View>

					<ScrollView
						className="flex-1 px-5"
						contentContainerStyle={{ paddingBottom: 32 }}
						showsVerticalScrollIndicator={false}
					>
						<View className="mt-5 rounded-[30px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5">
							<View className="flex-row items-center justify-between">
								<Text className="text-[28px] font-semibold text-sky-50">
									{result.isPotable ? 'Potable' : 'Not potable'}
								</Text>
								<View className={`rounded-full px-3 py-1 ${riskStyle.container}`}>
									<Text className={`text-[11px] font-semibold uppercase ${riskStyle.text}`}>
										{result.riskLevel || 'pending'}
									</Text>
								</View>
							</View>
							<Text className="mt-2 text-[13px] text-slate-300">{result.message}</Text>
							<View className="mt-4 items-center justify-center">
								<LottieView
									source={getConfidenceAnimation(result.probability)}
									autoPlay
									loop
									resizeMode="contain"
									style={{ width: GAUGE_WIDTH, height: GAUGE_WIDTH * 0.7 }}
								/>
							</View>
							<View className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
								<ConfidenceGauge probability={result.probability} threshold={0.5} />
								<View className="mt-4 pt-3 border-t border-slate-800">
									<Text className="text-[11px] text-slate-500">
										{timestampLabel} · {result.modelVersion}
									</Text>
									<Text className="text-[11px] text-slate-500">
										Source: {result?.meta?.source || 'n/a'} · Color: {result?.meta?.color || 'n/a'}
									</Text>
									{result.sampleId ? (
										<Text className="text-[11px] text-slate-500">Sample #{result.sampleId.slice(0, 8)}</Text>
									) : null}
								</View>
							</View>
							<Text className={`mt-3 text-[12px] ${result.saved ? 'text-emerald-300' : 'text-slate-400'}`}>
								{result.saved
									? 'Sample synced to Supabase.'
									: 'Cloud sync unavailable. Check Supabase credentials.'}
							</Text>
						</View>
						{/* Microbial Risk Assessment — placed immediately after potability verdict */}
						<MicrobialErrorBoundary>
							<MicrobialRiskSection result={result} />
						</MicrobialErrorBoundary>
						{groupedChecks.map((group) => (
							<View key={group.title} className="mt-6 rounded-[28px] border border-slate-900 bg-slate-950/70 p-5">
								<Text className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
									{group.title}
								</Text>
								{group.checks.length ? (
									<View className="mt-3 gap-3">
										{group.checks.map((check) => {
											const severity = parameterSeverityStyles[check.status] || parameterSeverityStyles.default;
											return (
												<View
													key={check.field}
													className={`rounded-2xl border px-4 py-3 ${severity.container}`}
												>
													<View className="flex-row items-center justify-between">
														<Text className="text-[13px] font-semibold text-slate-50">{check.label}</Text>
														<Text className={`text-[11px] font-semibold uppercase ${severity.badge}`}>
															{(check.status || 'pending').toUpperCase()}
														</Text>
													</View>
													<Text className="mt-1 text-[12px] text-slate-300">
														Observed {formatNumericValue(check.value)} · Recommended {formatRecommendedRange(check.recommendedRange)}
													</Text>
													<Text className="mt-1 text-[12px] text-slate-400">{check.detail}</Text>
													{typeof check.zScore === 'number' && Number.isFinite(check.zScore) ? (
														<Text className="mt-0.5 text-[11px] text-slate-500">Z-score {check.zScore.toFixed(2)}</Text>
													) : null}
												</View>
											);
										})}
									</View>
								) : (
									<Text className="mt-3 text-[12px] text-slate-500">No readings in this section.</Text>
								)}
							</View>
						))}

						{missingFeatures.length ? (
							<View className="mt-6 rounded-[24px] border border-amber-500/30 bg-amber-500/5 p-4">
								<Text className="text-[12px] font-semibold uppercase tracking-wide text-amber-200">
									Missing inputs
								</Text>
								<Text className="mt-2 text-[12px] text-amber-100/80">
									Provide these metrics next capture for tighter confidence intervals:
								</Text>
								<View className="mt-3 flex-row flex-wrap gap-2">
									{missingFeatures.map((field) => (
										<View key={field} className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1">
											<Text className="text-[11px] font-semibold uppercase tracking-wide text-amber-100">
												{field}
											</Text>
										</View>
									))}
								</View>
							</View>
						) : null}
					</ScrollView>
				</SafeAreaView>
		</Modal>
	);
};

export default WaterResultScreen;
