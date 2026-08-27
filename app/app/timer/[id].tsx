import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '../../src/api/client';
import { Procedure, ProcedureStep } from '../../src/types';
import {
  cancelStepNotifications,
  scheduleStepNotifications,
  ScheduledStep,
} from '../../src/hooks/useNotifications';

type TimerState = 'idle' | 'running' | 'paused' | 'done';

function formatTime(seconds: number) {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function StepRow({ step, active, done }: { step: ProcedureStep; active: boolean; done: boolean }) {
  return (
    <View style={[styles.stepRow, active && styles.stepRowActive, done && styles.stepRowDone]}>
      <View style={styles.stepInfo}>
        <Text style={[styles.stepName, active && styles.stepNameActive, done && styles.stepNameDone]}>
          {step.name}
        </Text>
        {step.chemical_name && (
          <Text style={[styles.stepSub, styles.stepChemical, done && styles.stepSubDone]}>🧪 {step.chemical_name}</Text>
        )}
        {step.temperature_c != null && (
          <Text style={[styles.stepSub, done && styles.stepSubDone]}>{step.temperature_c}°C</Text>
        )}
        {step.agitation_notes && (
          <Text style={[styles.stepSub, done && styles.stepSubDone]}>{step.agitation_notes}</Text>
        )}
      </View>
      <Text style={[styles.stepDuration, active && styles.stepDurationActive, done && styles.stepDurationDone]}>
        {formatTime(step.duration_seconds)}
      </Text>
      {done && <Text style={styles.checkmark}>✓</Text>}
    </View>
  );
}

function RollStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable
        style={[styles.stepperBtn, value <= 1 && styles.stepperBtnDisabled]}
        onPress={() => value > 1 && onChange(value - 1)}
        disabled={value <= 1}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </Pressable>
      <View style={styles.stepperValue}>
        <Text style={styles.stepperNum}>{value}</Text>
        <Text style={styles.stepperLabel}>{value === 1 ? 'roll' : 'rolls'}</Text>
      </View>
      <Pressable style={styles.stepperBtn} onPress={() => onChange(value + 1)}>
        <Text style={styles.stepperBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

export default function TimerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [rollCount, setRollCount] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [state, setState] = useState<TimerState>('idle');
  const [logging, setLogging] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIdsRef = useRef<string[]>([]);
  const remainingRef = useRef(0);
  const currentStepRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    api.procedures.get(Number(id)).then(p => {
      setProcedure(p);
      navigation.setOptions({ title: p.name });
      if (p.steps.length > 0) {
        setRemaining(p.steps[0].duration_seconds);
        remainingRef.current = p.steps[0].duration_seconds;
      }
    }).catch(console.error);
  }, [id]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelStepNotifications(notifIdsRef.current).catch(() => {});
    };
  }, []);

  function buildPendingSteps(proc: Procedure, stepIdx: number, stepRemaining: number): ScheduledStep[] {
    const result: ScheduledStep[] = [];
    for (let i = stepIdx; i < proc.steps.length; i++) {
      result.push({
        name: proc.steps[i].name,
        offsetSeconds: i === stepIdx ? stepRemaining : proc.steps[i].duration_seconds,
      });
    }
    return result;
  }

  function tick() {
    setRemaining(prev => {
      remainingRef.current = prev - 1;
      if (prev <= 1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([0, 400, 200, 400]);
        return 0;
      }
      if (prev <= 11) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return prev - 1;
    });
  }

  async function startResume() {
    if (!procedure) return;
    setState('running');
    intervalRef.current = setInterval(tick, 1000);
    try {
      const ids = await scheduleStepNotifications(
        buildPendingSteps(procedure, currentStepRef.current, remainingRef.current)
      );
      notifIdsRef.current = ids;
    } catch (e) { console.error('notifications', e); }
  }

  async function pause() {
    clearInterval(intervalRef.current!);
    setState('paused');
    await cancelStepNotifications(notifIdsRef.current);
    notifIdsRef.current = [];
  }

  function handleStartStop() {
    if (state === 'idle' || state === 'paused') startResume();
    else if (state === 'running') pause();
  }

  async function nextStep() {
    if (!procedure) return;
    clearInterval(intervalRef.current!);
    await cancelStepNotifications(notifIdsRef.current);
    notifIdsRef.current = [];

    const next = currentStep + 1;
    if (next >= procedure.steps.length) {
      setState('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 500, 300, 500, 300, 500]);
      return;
    }

    const nextRemaining = procedure.steps[next].duration_seconds;
    setCurrentStep(next);
    setRemaining(nextRemaining);
    currentStepRef.current = next;
    remainingRef.current = nextRemaining;

    intervalRef.current = setInterval(tick, 1000);
    setState('running');
    try {
      const ids = await scheduleStepNotifications(buildPendingSteps(procedure, next, nextRemaining));
      notifIdsRef.current = ids;
    } catch (e) { console.error('notifications', e); }
  }

  function reset() {
    clearInterval(intervalRef.current!);
    cancelStepNotifications(notifIdsRef.current).catch(() => {});
    notifIdsRef.current = [];
    if (!procedure) return;
    const firstDuration = procedure.steps[0]?.duration_seconds ?? 0;
    setCurrentStep(0);
    setRemaining(firstDuration);
    currentStepRef.current = 0;
    remainingRef.current = firstDuration;
    setState('idle');
  }

  async function logRun() {
    if (!procedure) return;
    setLogging(true);
    try {
      await api.procedures.run(procedure.id, { roll_count: rollCount });
      reset();
    } catch (e: any) {
      Alert.alert('Error logging run', e.message);
    } finally {
      setLogging(false);
    }
  }

  useEffect(() => {
    if (state === 'running' && remaining === 0) {
      clearInterval(intervalRef.current!);
      setState('paused');
    }
  }, [remaining, state]);

  if (!procedure) return <View style={styles.loading}><Text style={styles.loadingText}>Loading…</Text></View>;

  // ── Done screen ────────────────────────────────────────────────────────────
  if (state === 'done') {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneEmoji}>🎞️</Text>
        <Text style={styles.doneTitle}>Development Complete!</Text>
        <Text style={styles.doneSub}>Fix and wash before opening the tank.</Text>

        <View style={styles.doneCard}>
          <Text style={styles.doneCardLabel}>How many rolls did you develop?</Text>
          <RollStepper value={rollCount} onChange={setRollCount} />
        </View>

        <Pressable style={[styles.logBtn, logging && styles.logBtnDisabled]} onPress={logRun} disabled={logging}>
          <Text style={styles.logBtnText}>
            {logging ? 'Logging…' : `Log ${rollCount} ${rollCount === 1 ? 'roll' : 'rolls'} & update chemicals`}
          </Text>
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={reset}>
          <Text style={styles.skipBtnText}>Skip logging</Text>
        </Pressable>
      </View>
    );
  }

  const step = procedure.steps[currentStep];
  const totalElapsed = procedure.steps
    .slice(0, currentStep)
    .reduce((s, st) => s + st.duration_seconds, 0) + (step.duration_seconds - remaining);
  const totalDuration = procedure.steps.reduce((s, st) => s + st.duration_seconds, 0);
  const overallProgress = totalDuration > 0 ? totalElapsed / totalDuration : 0;

  // ── Timer screen ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${overallProgress * 100}%` as any }]} />
      </View>

      <View style={styles.timerBlock}>
        <Text style={styles.stepLabel}>{step.name}</Text>
        {step.temperature_c != null && <Text style={styles.tempLabel}>{step.temperature_c}°C</Text>}
        <Text style={[styles.timerDisplay, remaining === 0 && styles.timerDisplayDone]}>
          {formatTime(remaining)}
        </Text>
        {step.agitation_notes && (
          <Text style={styles.agitationNote}>{step.agitation_notes}</Text>
        )}
        {state === 'running' && (
          <Text style={styles.bgNote}>You'll be notified when each step ends</Text>
        )}
      </View>

      {/* Roll count stepper — only visible before timer starts */}
      {state === 'idle' && (
        <View style={styles.rollCountBlock}>
          <Text style={styles.rollCountLabel}>Rolls in tank</Text>
          <RollStepper value={rollCount} onChange={setRollCount} />
        </View>
      )}

      <View style={styles.controls}>
        <Pressable style={styles.secondaryBtn} onPress={reset}>
          <Text style={styles.secondaryBtnText}>Reset</Text>
        </Pressable>
        <Pressable style={[styles.mainBtn, state === 'running' && styles.mainBtnPaused]} onPress={handleStartStop}>
          <Text style={styles.mainBtnText}>
            {state === 'idle' ? 'Start' : state === 'running' ? 'Pause' : 'Resume'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, state === 'idle' && { opacity: 0.3 }]}
          onPress={nextStep}
          disabled={state === 'idle'}
        >
          <Text style={styles.secondaryBtnText}>Next →</Text>
        </Pressable>
      </View>

      <View style={styles.stepList}>
        {procedure.steps.map((s, i) => (
          <StepRow key={s.id} step={s} active={i === currentStep} done={i < currentStep} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 20 },
  loading: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9ca3af' },
  progressTrack: { height: 3, backgroundColor: '#333', borderRadius: 2, marginBottom: 32 },
  progressFill: { height: 3, backgroundColor: '#10b981', borderRadius: 2 },
  timerBlock: { alignItems: 'center', marginBottom: 24 },
  stepLabel: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  tempLabel: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  timerDisplay: {
    fontSize: 80, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'], letterSpacing: -2,
  },
  timerDisplayDone: { color: '#10b981' },
  agitationNote: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 12, maxWidth: 260 },
  bgNote: { fontSize: 11, color: '#4b5563', marginTop: 10 },
  rollCountBlock: {
    alignItems: 'center', marginBottom: 16,
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
  },
  rollCountLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600', marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText: { color: '#fff', fontSize: 24, lineHeight: 28, fontWeight: '300' },
  stepperValue: { alignItems: 'center', minWidth: 60 },
  stepperNum: { color: '#fff', fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  stepperLabel: { color: '#6b7280', fontSize: 13 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
  mainBtn: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 36, paddingVertical: 16 },
  mainBtnPaused: { backgroundColor: '#f59e0b' },
  mainBtnText: { fontSize: 18, fontWeight: '800', color: '#0f0f0f' },
  secondaryBtn: {
    backgroundColor: '#1f1f1f', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  stepList: { gap: 8 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10,
    backgroundColor: '#1a1a1a', gap: 8,
  },
  stepRowActive: { backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#10b981' },
  stepRowDone: { opacity: 0.4 },
  stepInfo: { flex: 1 },
  stepName: { fontSize: 14, fontWeight: '600', color: '#d1d5db' },
  stepNameActive: { color: '#fff' },
  stepNameDone: { color: '#6b7280' },
  stepSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  stepChemical: { color: '#10b981' },
  stepSubDone: { color: '#374151' },
  stepDuration: { fontSize: 14, fontWeight: '600', color: '#6b7280', fontVariant: ['tabular-nums'] },
  stepDurationActive: { color: '#10b981' },
  stepDurationDone: { color: '#374151' },
  checkmark: { color: '#10b981', fontSize: 16 },
  // Done screen
  doneContainer: {
    flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 16,
  },
  doneEmoji: { fontSize: 60 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  doneSub: { fontSize: 15, color: '#9ca3af' },
  doneCard: {
    width: '100%', backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 16, marginTop: 8,
  },
  doneCardLabel: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  logBtn: {
    width: '100%', backgroundColor: '#10b981', borderRadius: 14,
    padding: 18, alignItems: 'center',
  },
  logBtnDisabled: { opacity: 0.5 },
  logBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipBtn: { padding: 12 },
  skipBtnText: { color: '#4b5563', fontSize: 14 },
});
