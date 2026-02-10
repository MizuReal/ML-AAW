import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { supabase } from '../utils/supabaseClient';
import { assessMicrobialRisk } from '../utils/api';
import WaterResultScreen from './WaterResultScreen';

const SUPABASE_SAMPLES_TABLE = process.env.EXPO_PUBLIC_SUPABASE_SAMPLES_TABLE || 'field_samples';
const DEFAULT_DECISION_THRESHOLD = 0.58;

const CONTAINER_HISTORY = [
  {
    id: 'C-208',
    timestamp: '2026-01-18 • 10:02 UTC',
    location: 'Plant intake bottle A',
    predictedClass: 'Fill level optimal',
    confidence: 0.95,
    status: 'Cleared',
  },
  {
    id: 'C-203',
    timestamp: '2026-01-18 • 08:55 UTC',
    location: 'Irrigation canal grab',
    predictedClass: 'Surface film anomaly',
    confidence: 0.81,
    status: 'Review',
  },
  {
    id: 'C-195',
    timestamp: '2026-01-17 • 19:11 UTC',
    location: 'Downstream industrial outflow',
    predictedClass: 'Strong color cast detected',
    confidence: 0.9,
    status: 'Alert',
  },
];

const STATUS_STYLES = {
  Cleared: 'border-emerald-500/60 bg-emerald-500/15',
  Review: 'border-amber-500/60 bg-amber-500/10',
  Alert: 'border-rose-500/60 bg-rose-500/10',
};

const STATUS_TEXT_CLASSES = {
  Cleared: 'text-sky-50',
  Review: 'text-amber-200',
  Alert: 'text-rose-200',
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'timestamp unavailable';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'timestamp unavailable';
  return date.toLocaleString();
};

const buildPredictedClass = (row) => {
  if (typeof row?.prediction_is_potable !== 'boolean') {
    return row?.risk_level ? `Risk: ${row.risk_level}` : 'Prediction pending';
  }
  if (row.prediction_is_potable) {
    return row.risk_level ? `Potable (${row.risk_level})` : 'Potable';
  }
  return row.risk_level ? `Non-potable (${row.risk_level})` : 'Non-potable';
};

const deriveStatus = (row) => {
  const risk = (row?.risk_level || '').toLowerCase();
  if (risk === 'safe' || risk === 'borderline') return 'Cleared';
  if (risk === 'watch') return 'Review';
  if (risk === 'unsafe') return 'Alert';
  return 'Review';
};

const buildSummaryMessage = (row) => {
  if (row?.prediction_is_potable) {
    return row?.risk_level === 'safe'
      ? 'Sample matches potable water profile with strong confidence.'
      : 'Sample is marginally potable but monitor outlier parameters.';
  }
  return row?.risk_level === 'watch'
    ? 'Sample trends toward non-potable; investigate highlighted parameters.'
    : 'Sample is likely non-potable; escalate for confirmatory testing.';
};

const buildResultFromRow = (row) => ({
  isPotable: !!row?.prediction_is_potable,
  probability: Number.isFinite(row?.prediction_probability)
    ? Number(row.prediction_probability)
    : 0,
  decisionThreshold: DEFAULT_DECISION_THRESHOLD,
  riskLevel: row?.risk_level || 'unknown',
  modelVersion: row?.model_version || 'model',
  timestamp: row?.created_at || null,
  checks: Array.isArray(row?.anomaly_checks) ? row.anomaly_checks : [],
  missingFeatures: [],
  meta: {
    source: row?.source || null,
    color: row?.color || null,
    sampleLabel: row?.sample_label || null,
  },
  saved: true,
  sampleId: row?.id || null,
  message: buildSummaryMessage(row),
  // Microbial risk fields (stored in Supabase)
  microbialRiskLevel: row?.microbial_risk || null,
  microbialScore: Number.isFinite(row?.microbial_score) ? row.microbial_score : null,
  microbialMaxScore: 14,
  possibleBacteria: Array.isArray(row?.possible_bacteria) ? row.possible_bacteria : [],
});

const PredictionHistoryScreen = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('data'); // 'data' | 'container'
  const [selectedId, setSelectedId] = useState(null);
  const [dataHistory, setDataHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailResult, setDetailResult] = useState(null);
  const screenAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 450,
      delay: 80,
      useNativeDriver: true,
    }).start();
  }, [screenAnim]);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (activeTab !== 'data') {
        return;
      }

      setLoading(true);
      try {
        const sessionResult = await supabase.auth.getSession();
        const userId = sessionResult?.data?.session?.user?.id || null;
        if (!userId) {
          if (isMounted) {
            setDataHistory([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from(SUPABASE_SAMPLES_TABLE)
          .select(
            'id, created_at, source, sample_label, color, risk_level, prediction_probability, prediction_is_potable, model_version, anomaly_checks, microbial_risk, microbial_score, possible_bacteria, ph, hardness, solids, chloramines, sulfate, conductivity, organic_carbon, trihalomethanes, turbidity'
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.warn('[Supabase] failed to load prediction history:', error.message || error);
          if (isMounted) {
            setDataHistory([]);
          }
          return;
        }

        const mapped = (data || []).map((row) => ({
          id: row.id,
          timestamp: formatTimestamp(row.created_at),
          location: row.sample_label || row.source || 'Sample',
          predictedClass: buildPredictedClass(row),
          confidence: Number.isFinite(row.prediction_probability)
            ? Number(row.prediction_probability)
            : 0,
          status: deriveStatus(row),
          _raw: row,
        }));

        if (isMounted) {
          setDataHistory(mapped);
        }
      } catch (error) {
        console.warn('[Supabase] unexpected history load error:', error?.message || error);
        if (isMounted) {
          setDataHistory([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const items = activeTab === 'data' ? dataHistory : CONTAINER_HISTORY;

  const renderCard = (item) => {
    const statusClass = STATUS_STYLES[item.status] || 'border-sky-700 bg-sky-900/40';
    const statusTextClass = STATUS_TEXT_CLASSES[item.status] || 'text-sky-100';
    const isSelected = activeTab === 'container' && selectedId === item.id;
    const canShowDetails = activeTab === 'data';

    return (
      <View
        key={item.id}
        className="mb-3 rounded-2xl border border-sky-900/80 bg-aquadark/80 p-4"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
              {activeTab === 'data' ? 'Sample' : 'Container'}
            </Text>
            <Text className="mt-1 text-[13px] font-semibold text-sky-50">
              {item.location}
            </Text>
            <Text className="mt-0.5 text-[11px] text-slate-400">{item.id} • {item.timestamp}</Text>
          </View>
          <View
            className={`rounded-full border px-3 py-1 ${statusClass}`}
          >
            <Text className={`text-[11px] font-medium ${statusTextClass}`}>
              {item.status}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
              Predicted class
            </Text>
            <Text className="mt-1 text-[13px] text-sky-50">
              {item.predictedClass}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
              Confidence
            </Text>
            <Text className="mt-1 text-[13px] font-semibold text-sky-50">
              {(item.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <View className="mt-3 h-1.5 w-full rounded-full bg-sky-900/60">
          <View
            className="h-full rounded-full bg-aquaprimary"
            style={{ width: `${Math.min(100, Math.max(5, item.confidence * 100))}%` }}
          />
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-[11px] text-slate-500">
            {activeTab === 'data'
              ? 'Status derives from saved risk level.'
              : 'Status combines model output with simple rules.'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={async () => {
              if (canShowDetails) {
                const row = item._raw;
                let result = buildResultFromRow(row);

                // If microbial risk wasn't stored, compute it on the fly
                if (!result.microbialRiskLevel && row) {
                  try {
                    const sample = {
                      ph: row.ph ?? null,
                      hardness: row.hardness ?? null,
                      solids: row.solids ?? null,
                      chloramines: row.chloramines ?? null,
                      sulfate: row.sulfate ?? null,
                      conductivity: row.conductivity ?? null,
                      organicCarbon: row.organic_carbon ?? null,
                      trihalomethanes: row.trihalomethanes ?? null,
                      turbidity: row.turbidity ?? null,
                    };
                    const microbial = await assessMicrobialRisk(sample);
                    if (microbial?.microbialRiskLevel) {
                      result = {
                        ...result,
                        microbialRiskLevel: microbial.microbialRiskLevel,
                        microbialRiskProbabilities: microbial.microbialRiskProbabilities || {},
                        microbialScore: microbial.microbialScore ?? null,
                        microbialMaxScore: microbial.microbialMaxScore ?? 14,
                        microbialViolations: microbial.microbialViolations || [],
                        possibleBacteria: microbial.possibleBacteria || [],
                      };
                    }
                  } catch (e) {
                    console.warn('[History] on-the-fly microbial assessment failed:', e?.message);
                  }
                }

                setDetailResult(result);
                setDetailVisible(true);
              } else {
                setSelectedId(isSelected ? null : item.id);
              }
            }}
            className="rounded-full border border-aquaprimary/70 bg-aquaprimary/10 px-3 py-1"
          >
            <Text className="text-[11px] font-medium text-sky-50">
              {isSelected ? 'Hide details' : 'View details'}
            </Text>
          </TouchableOpacity>
        </View>

        {isSelected && (
          <View className="mt-3 rounded-xl border border-sky-900/70 bg-sky-950/60 p-3">
            <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
              Details
            </Text>
            <Text className="mt-1 text-[12px] text-slate-300">
              This is a compact summary of the run. Integrate this
              card later with backend metadata (raw physicochemical
              values, analyst notes, and linked image batches).
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-aquadark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <WaterResultScreen
        visible={detailVisible && Boolean(detailResult)}
        result={detailResult}
        onClose={() => setDetailVisible(false)}
      />
      <Animated.View
        className="flex-1"
        style={{
          opacity: screenAnim,
          transform: [
            {
              translateY: screenAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        }}
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
        <Text className="text-[22px] font-bold text-sky-100">Predictions history</Text>
        <Text className="mt-1 text-[13px] text-slate-400">
          Review recent model runs across physicochemical samples and
          container images.
        </Text>

        <View className="mt-4 rounded-full bg-slate-950/70 p-1 flex-row">
          <TouchableOpacity
            activeOpacity={0.9}
            className={`flex-1 rounded-full px-3 py-1.5 ${
              activeTab === 'data' ? 'bg-aquaprimary/25' : 'bg-transparent'
            }`}
            onPress={() => setActiveTab('data')}
          >
            <Text
              className={`text-center text-[12px] font-medium ${
                activeTab === 'data' ? 'text-sky-50' : 'text-slate-400'
              }`}
            >
              Data history
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            className={`flex-1 rounded-full px-3 py-1.5 ${
              activeTab === 'container' ? 'bg-aquaprimary/25' : 'bg-transparent'
            }`}
            onPress={() => setActiveTab('container')}
          >
            <Text
              className={`text-center text-[12px] font-medium ${
                activeTab === 'container' ? 'text-sky-50' : 'text-slate-400'
              }`}
            >
              Container history
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="px-5"
        contentContainerClassName="pb-10 pt-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-1 rounded-2xl border border-sky-900/70 bg-sky-950/40 p-4">
          <Text className="text-[11px] font-medium uppercase tracking-wide text-sky-300">
            {activeTab === 'data' ? 'Data predictions' : 'Container predictions'}
          </Text>
          <Text className="mt-1 text-[12px] text-slate-400">
            Each entry shows timestamp, sample or location, predicted
            class, confidence, status, and a quick details toggle.
          </Text>
        </View>

        <View className="mt-3">
          {activeTab === 'data' && loading ? (
            <View className="rounded-2xl border border-sky-900/70 bg-sky-950/40 p-4">
              <Text className="text-[12px] text-slate-400">Loading recent samples...</Text>
            </View>
          ) : null}
          {activeTab === 'data' && !loading && items.length === 0 ? (
            <View className="rounded-2xl border border-sky-900/70 bg-sky-950/40 p-4">
              <Text className="text-[12px] text-slate-400">
                No saved samples yet. Run a new check to populate history.
              </Text>
            </View>
          ) : null}
          {items.map(renderCard)}
        </View>
      </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default PredictionHistoryScreen;
