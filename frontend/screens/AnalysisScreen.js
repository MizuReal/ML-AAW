import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { supabase } from '../utils/supabaseClient';

const SUPABASE_SAMPLES_TABLE = process.env.EXPO_PUBLIC_SUPABASE_SAMPLES_TABLE || 'field_samples';
const CHART_WIDTH = Math.max(280, Dimensions.get('window').width - 58);
const CHART_HEIGHT = 210;
const CHART_CONFIG = {
  backgroundGradientFrom: '#020617',
  backgroundGradientTo: '#020617',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(125, 211, 252, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  propsForDots: {
    r: '3',
    strokeWidth: '1.5',
    stroke: '#0f172a',
  },
  propsForBackgroundLines: {
    stroke: 'rgba(51, 65, 85, 0.55)',
    strokeWidth: 1,
  },
  fillShadowGradient: '#22d3ee',
  fillShadowGradientOpacity: 0.14,
};

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return '--';
  return `${Math.round(value * 100)}%`;
};

const average = (values = []) => {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const median = (values = []) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const compactDateLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const compactTimeLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
};

const riskToScore = (risk = '') => {
  const normalized = String(risk || '').toLowerCase();
  if (normalized === 'safe') return 0.15;
  if (normalized === 'borderline') return 0.35;
  if (normalized === 'watch') return 0.65;
  if (normalized === 'unsafe') return 0.88;
  return 0.5;
};

const riskToStatus = (risk = '') => {
  const normalized = String(risk || '').toLowerCase();
  if (normalized === 'safe' || normalized === 'borderline') return 'Cleared';
  if (normalized === 'watch') return 'Review';
  if (normalized === 'unsafe') return 'Alert';
  return 'Review';
};

const describePh = (value) => {
  if (!Number.isFinite(value)) return 'No data';
  if (value < 6.5) return 'Acidic';
  if (value > 8.5) return 'Alkaline';
  return 'Balanced';
};

const describeTurbidity = (value) => {
  if (!Number.isFinite(value)) return 'No data';
  if (value <= 1) return 'Very clear';
  if (value <= 5) return 'Acceptable';
  return 'Elevated';
};

const describeConductivity = (value) => {
  if (!Number.isFinite(value)) return 'No data';
  if (value < 250) return 'Low mineral load';
  if (value <= 600) return 'Moderate mineral load';
  return 'High mineral load';
};

const describeHardness = (value) => {
  if (!Number.isFinite(value)) return 'No data';
  if (value < 60) return 'Soft';
  if (value <= 120) return 'Moderate';
  if (value <= 180) return 'Hard';
  return 'Very hard';
};

const buildRecentDayBuckets = (samples, days = 7) => {
  const buckets = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    buckets.push({ key, date, count: 0 });
  }

  samples.forEach((row) => {
    const date = row?.created_at ? new Date(row.created_at) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const target = buckets.find((bucket) => bucket.key === key);
    if (target) target.count += 1;
  });

  return buckets;
};

const AnalysisScreen = ({ onNavigate }) => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const screenAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 450,
      delay: 50,
      useNativeDriver: true,
    }).start();
  }, [screenAnim]);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const sessionResult = await supabase.auth.getSession();
        const userId = sessionResult?.data?.session?.user?.id || null;

        if (!userId) {
          if (isMounted) {
            setSamples([]);
          }
          return;
        }

        const { data, error: queryError } = await supabase
          .from(SUPABASE_SAMPLES_TABLE)
          .select('id, created_at, source, risk_level, prediction_probability, prediction_is_potable, ph, turbidity, conductivity, hardness, solids, chloramines, sulfate, organic_carbon, trihalomethanes, microbial_risk, microbial_score')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(120);

        if (queryError) {
          throw queryError;
        }

        if (isMounted) {
          setSamples(data || []);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError?.message || 'Unable to load analytics data.');
          setSamples([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const analytics = useMemo(() => {
    const total = samples.length;
    const potableCount = samples.filter((row) => row?.prediction_is_potable === true).length;
    const watchOrUnsafe = samples.filter((row) => {
      const risk = String(row?.risk_level || '').toLowerCase();
      return risk === 'watch' || risk === 'unsafe';
    }).length;

    const probabilityValues = samples
      .map((row) => numeric(row?.prediction_probability))
      .filter((value) => Number.isFinite(value));

    const avgProbability = average(probabilityValues);
    const medianProbability = median(probabilityValues);

    const recent = [...samples].reverse().slice(-12);
    const confidenceTrend = {
      labels: recent.map((row) => compactTimeLabel(row?.created_at)),
      datasets: [
        {
          data: recent.map((row) => {
            const value = numeric(row?.prediction_probability);
            return Number.isFinite(value) ? Number(value) : 0;
          }),
          color: (opacity = 1) => `rgba(34, 211, 238, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Prediction confidence'],
    };

    const riskTrend = {
      labels: recent.map((row) => compactTimeLabel(row?.created_at)),
      datasets: [
        {
          data: recent.map((row) => riskToScore(row?.risk_level)),
          color: (opacity = 1) => `rgba(244, 114, 182, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Risk index proxy'],
    };

    const dayBuckets = buildRecentDayBuckets(samples, 7);
    const volumeByDay = {
      labels: dayBuckets.map((bucket) => compactDateLabel(bucket.date)),
      datasets: [
        {
          data: dayBuckets.map((bucket) => bucket.count),
        },
      ],
    };

    const statusCounts = { Cleared: 0, Review: 0, Alert: 0 };
    samples.forEach((row) => {
      const status = riskToStatus(row?.risk_level);
      statusCounts[status] += 1;
    });

    const statusDistribution = [
      {
        name: 'Cleared',
        population: statusCounts.Cleared,
        color: '#34d399',
        legendFontColor: '#cbd5e1',
        legendFontSize: 11,
      },
      {
        name: 'Review',
        population: statusCounts.Review,
        color: '#fbbf24',
        legendFontColor: '#cbd5e1',
        legendFontSize: 11,
      },
      {
        name: 'Alert',
        population: statusCounts.Alert,
        color: '#fb7185',
        legendFontColor: '#cbd5e1',
        legendFontSize: 11,
      },
    ].filter((item) => item.population > 0);

    const phValues = samples.map((row) => numeric(row?.ph)).filter((value) => Number.isFinite(value));
    const turbidityValues = samples.map((row) => numeric(row?.turbidity)).filter((value) => Number.isFinite(value));
    const conductivityValues = samples.map((row) => numeric(row?.conductivity)).filter((value) => Number.isFinite(value));
    const hardnessValues = samples.map((row) => numeric(row?.hardness)).filter((value) => Number.isFinite(value));

    const parameterCards = [
      {
        key: 'ph',
        label: 'pH',
        avg: average(phValues),
        median: median(phValues),
        descriptor: describePh(average(phValues)),
      },
      {
        key: 'turbidity',
        label: 'Turbidity',
        avg: average(turbidityValues),
        median: median(turbidityValues),
        descriptor: describeTurbidity(average(turbidityValues)),
      },
      {
        key: 'conductivity',
        label: 'Conductivity',
        avg: average(conductivityValues),
        median: median(conductivityValues),
        descriptor: describeConductivity(average(conductivityValues)),
      },
      {
        key: 'hardness',
        label: 'Hardness',
        avg: average(hardnessValues),
        median: median(hardnessValues),
        descriptor: describeHardness(average(hardnessValues)),
      },
    ];

    const microbialCounts = { low: 0, medium: 0, high: 0, unknown: 0 };
    samples.forEach((row) => {
      const risk = String(row?.microbial_risk || '').toLowerCase();
      if (risk === 'low' || risk === 'medium' || risk === 'high') {
        microbialCounts[risk] += 1;
      } else {
        microbialCounts.unknown += 1;
      }
    });

    const insights = [];
    if (!total) {
      insights.push('No saved samples yet. Submit samples from Data Input to unlock analytics trends.');
    } else {
      insights.push(`You have ${total} saved samples with ${formatPercent(total ? potableCount / total : 0)} potable outcomes.`);
      insights.push(`Watch/unsafe samples count is ${watchOrUnsafe}, useful for targeted follow-up checks.`);
      if (Number.isFinite(avgProbability)) {
        insights.push(`Average model confidence is ${formatPercent(avgProbability)} (median ${formatPercent(medianProbability || 0)}).`);
      }
      const phAvg = average(phValues);
      if (Number.isFinite(phAvg)) {
        insights.push(`pH trend is ${describePh(phAvg).toLowerCase()} with average ${phAvg.toFixed(2)}.`);
      }
      const turbidityAvg = average(turbidityValues);
      if (Number.isFinite(turbidityAvg)) {
        insights.push(`Turbidity is ${describeTurbidity(turbidityAvg).toLowerCase()} at ${turbidityAvg.toFixed(2)} NTU average.`);
      }
    }

    return {
      total,
      potableCount,
      watchOrUnsafe,
      avgProbability,
      confidenceTrend,
      riskTrend,
      volumeByDay,
      statusDistribution,
      parameterCards,
      microbialCounts,
      insights,
    };
  }, [samples]);

  const hasChartData = analytics.total > 0;
  const riskDistTotal = analytics.statusDistribution.reduce((sum, row) => sum + row.population, 0);

  return (
    <Animated.View
      className="flex-1 bg-aquadark"
      style={{
        opacity: screenAnim,
        transform: [
          {
            translateY: screenAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
      }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View className="px-5 pt-10 pb-3">
        <View className="mb-2 flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full border border-sky-900/70 bg-aquadark/80 px-3 py-1.5"
            onPress={() => onNavigate && onNavigate('home')}
          >
            <Text className="text-[12px] font-medium text-sky-100">⟵ Dashboard</Text>
          </TouchableOpacity>
          <View className="rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              Ops Live
            </Text>
          </View>
        </View>
        <Text className="text-[22px] font-bold text-sky-100">Analysis & trends</Text>
        <Text className="mt-1 text-[13px] text-slate-400">
          Comprehensive analytics built from your saved sample history.
        </Text>
      </View>

      <ScrollView
        className="px-5"
        contentContainerClassName="pb-10 gap-4"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="mt-8 items-center justify-center rounded-2xl border border-sky-900/70 bg-slate-950/70 p-6">
            <ActivityIndicator size="small" color="#7dd3fc" />
            <Text className="mt-3 text-[12px] text-slate-300">Loading analytics...</Text>
          </View>
        ) : (
          <>
            {!!error && (
              <View className="mt-1 rounded-2xl border border-rose-500/60 bg-rose-900/15 p-4">
                <Text className="text-[12px] font-semibold text-rose-200">Analytics load issue</Text>
                <Text className="mt-1 text-[12px] text-rose-100/90">{error}</Text>
              </View>
            )}

            <View className="mt-1 rounded-2xl border border-sky-900/70 bg-slate-950/75 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
                Overview KPIs
              </Text>
              <View className="mt-3 flex-row gap-3">
                <View className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3">
                  <Text className="text-[10px] uppercase tracking-wide text-slate-400">Saved samples</Text>
                  <Text className="mt-1 text-[20px] font-semibold text-sky-50">{analytics.total}</Text>
                </View>
                <View className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3">
                  <Text className="text-[10px] uppercase tracking-wide text-slate-400">Potable rate</Text>
                  <Text className="mt-1 text-[20px] font-semibold text-emerald-300">
                    {formatPercent(analytics.total ? analytics.potableCount / analytics.total : 0)}
                  </Text>
                </View>
              </View>
              <View className="mt-3 flex-row gap-3">
                <View className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3">
                  <Text className="text-[10px] uppercase tracking-wide text-slate-400">Watch + unsafe</Text>
                  <Text className="mt-1 text-[20px] font-semibold text-amber-300">{analytics.watchOrUnsafe}</Text>
                </View>
                <View className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3">
                  <Text className="text-[10px] uppercase tracking-wide text-slate-400">Avg confidence</Text>
                  <Text className="mt-1 text-[20px] font-semibold text-sky-300">
                    {formatPercent(analytics.avgProbability || 0)}
                  </Text>
                </View>
              </View>
            </View>

            <View className="rounded-2xl border border-sky-900/70 bg-sky-950/40 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
                Confidence trend (latest samples)
              </Text>
              <Text className="mt-1 text-[12px] text-slate-400">
                Sequence of prediction confidence scores from the most recent entries.
              </Text>
              {hasChartData ? (
                <LineChart
                  data={analytics.confidenceTrend}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  chartConfig={CHART_CONFIG}
                  bezier
                  fromZero
                  style={{ marginTop: 12, borderRadius: 16 }}
                />
              ) : (
                <Text className="mt-3 text-[12px] text-slate-400">No chart data yet.</Text>
              )}
            </View>

            <View className="rounded-2xl border border-sky-900/70 bg-slate-950/70 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
                Daily sample volume (7 days)
              </Text>
              <Text className="mt-1 text-[12px] text-slate-400">
                Operational throughput trend from your saved records.
              </Text>
              {hasChartData ? (
                <BarChart
                  data={analytics.volumeByDay}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                  showValuesOnTopOfBars
                  chartConfig={{
                    ...CHART_CONFIG,
                    color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
                  }}
                  style={{ marginTop: 12, borderRadius: 16 }}
                />
              ) : (
                <Text className="mt-3 text-[12px] text-slate-400">No chart data yet.</Text>
              )}
            </View>

            <View className="rounded-2xl border border-sky-900/70 bg-aquadark/80 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
                Outcome mix
              </Text>
              <Text className="mt-1 text-[12px] text-slate-400">
                Share of cleared, review, and alert outcomes based on saved risk levels.
              </Text>
              {riskDistTotal > 0 ? (
                <PieChart
                  data={analytics.statusDistribution}
                  width={CHART_WIDTH}
                  height={210}
                  chartConfig={CHART_CONFIG}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="10"
                  absolute
                />
              ) : (
                <Text className="mt-3 text-[12px] text-slate-400">No distribution data yet.</Text>
              )}
            </View>

            <View className="rounded-2xl border border-sky-900/70 bg-slate-950/70 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
                Risk index trajectory
              </Text>
              <Text className="mt-1 text-[12px] text-slate-400">
                Risk-level proxy over recent samples (safe → unsafe mapped to 0.15 → 0.88).
              </Text>
              {hasChartData ? (
                <LineChart
                  data={analytics.riskTrend}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  chartConfig={{
                    ...CHART_CONFIG,
                    color: (opacity = 1) => `rgba(251, 113, 133, ${opacity})`,
                  }}
                  fromZero
                  style={{ marginTop: 12, borderRadius: 16 }}
                />
              ) : (
                <Text className="mt-3 text-[12px] text-slate-400">No risk trend data yet.</Text>
              )}
            </View>

            <View className="rounded-2xl border border-sky-900/80 bg-sky-950/40 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
                Parameter intelligence
              </Text>
              <Text className="mt-1 text-[12px] text-slate-400">
                Aggregated central tendency and interpretation across core model features.
              </Text>
              <View className="mt-3 gap-3">
                {analytics.parameterCards.map((param) => (
                  <View key={param.key} className="rounded-xl border border-slate-800/70 bg-slate-900/75 p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[13px] font-semibold text-sky-100">{param.label}</Text>
                      <Text className="text-[11px] text-slate-400" numberOfLines={1}>{param.descriptor}</Text>
                    </View>
                    <View className="mt-2 flex-row justify-between">
                      <Text className="text-[11px] text-slate-400">
                        Avg: {Number.isFinite(param.avg) ? param.avg.toFixed(2) : '--'}
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        Median: {Number.isFinite(param.median) ? param.median.toFixed(2) : '--'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="rounded-2xl border border-sky-900/70 bg-slate-950/75 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
                Microbial risk snapshot
              </Text>
              <View className="mt-3 flex-row gap-3">
                <View className="flex-1 rounded-xl border border-slate-800/70 bg-slate-900/80 p-3">
                  <Text className="text-[11px] text-slate-400">Low</Text>
                  <Text className="mt-1 text-[18px] font-semibold text-emerald-300">{analytics.microbialCounts.low}</Text>
                </View>
                <View className="flex-1 rounded-xl border border-slate-800/70 bg-slate-900/80 p-3">
                  <Text className="text-[11px] text-slate-400">Medium</Text>
                  <Text className="mt-1 text-[18px] font-semibold text-amber-300">{analytics.microbialCounts.medium}</Text>
                </View>
                <View className="flex-1 rounded-xl border border-slate-800/70 bg-slate-900/80 p-3">
                  <Text className="text-[11px] text-slate-400">High</Text>
                  <Text className="mt-1 text-[18px] font-semibold text-rose-300">{analytics.microbialCounts.high}</Text>
                </View>
              </View>
            </View>

            <View className="rounded-2xl border border-emerald-500/50 bg-emerald-900/10 p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-emerald-300">
                Automated insights
              </Text>
              <View className="mt-2 gap-2">
                {analytics.insights.map((insight, index) => (
                  <Text key={`${insight}-${index}`} className="text-[12px] text-slate-200">
                    • {insight}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

export default AnalysisScreen;
