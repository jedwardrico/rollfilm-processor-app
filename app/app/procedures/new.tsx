import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/api/client';
import { Chemical, Process } from '../../src/types';
import { SelectModal, SelectTrigger } from '../../src/components/SelectModal';

interface StepDraft {
  key: number;
  name: string;
  duration_seconds: string;
  temperature_c: string;
  agitation_notes: string;
  chemical_id?: number;
  chemical_name?: string;
}

let stepKey = 0;
function newStep(): StepDraft {
  return { key: ++stepKey, name: '', duration_seconds: '60', temperature_c: '', agitation_notes: '' };
}

export default function NewProcedureScreen() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [filmStocks, setFilmStocks] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [processId, setProcessId] = useState('BW');
  const [filmStock, setFilmStock] = useState('');
  const [temperature, setTemperature] = useState('20');
  const [pushPull, setPushPull] = useState('0');
  const [notes, setNotes] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([newStep()]);
  const [saving, setSaving] = useState(false);

  const [filmStockOpen, setFilmStockOpen] = useState(false);
  // Key of the step currently picking a chemical (null = closed)
  const [chemPickerStepKey, setChemPickerStepKey] = useState<number | null>(null);

  useEffect(() => {
    api.processes.list().then(setProcesses).catch(console.error);
    api.rolls.filmStocks().then(setFilmStocks).catch(console.error);
  }, []);

  useEffect(() => {
    api.chemicals.list({ active: true, process_id: processId })
      .then(setChemicals)
      .catch(console.error);
    // Clear chemical selections when process changes
    setSteps(prev => prev.map(s => ({ ...s, chemical_id: undefined, chemical_name: undefined })));
  }, [processId]);

  function updateStep(key: number, patch: Partial<StepDraft>) {
    setSteps(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s));
  }

  function addStep() { setSteps(prev => [...prev, newStep()]); }
  function removeStep(key: number) { setSteps(prev => prev.filter(s => s.key !== key)); }

  async function save() {
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    if (steps.some(s => !s.name.trim())) { Alert.alert('All steps need a name'); return; }
    setSaving(true);
    try {
      await api.procedures.create({
        name: name.trim(),
        process_id: processId,
        film_stock: filmStock || undefined,
        temperature_c: temperature ? Number(temperature) : undefined,
        push_pull: Number(pushPull),
        notes: notes || undefined,
        steps: steps.map((s, i) => ({
          step_order: i + 1,
          name: s.name.trim(),
          duration_seconds: Number(s.duration_seconds) || 60,
          temperature_c: s.temperature_c ? Number(s.temperature_c) : undefined,
          agitation_notes: s.agitation_notes || undefined,
          chemical_id: s.chemical_id,
        })),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  const filmStockOptions = filmStocks.map(f => ({ label: f, value: f }));
  const chemOptions = chemicals.map(c => ({
    label: `${c.name}  (${c.role})`,
    value: String(c.id),
  }));
  const activePickerStep = chemPickerStepKey !== null
    ? steps.find(s => s.key === chemPickerStepKey)
    : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Procedure Name *">
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="e.g. HC-110 Dil B · HP5+ · EI 1600" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Process">
        <View style={styles.pills}>
          {processes.map(p => (
            <Pressable key={p.id} style={[styles.pill, processId === p.id && styles.pillActive]}
              onPress={() => setProcessId(p.id)}>
              <Text style={[styles.pillText, processId === p.id && styles.pillTextActive]}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <SelectTrigger
        label="Film Stock"
        value={filmStock}
        placeholder="Select or type a film stock…"
        onPress={() => setFilmStockOpen(true)}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Temp (°C)">
            <TextInput style={styles.input} value={temperature} onChangeText={setTemperature}
              keyboardType="numeric" placeholder="20" placeholderTextColor="#aaa" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Push/Pull">
            <View style={styles.pills}>
              {['-2', '-1', '0', '+1', '+2', '+3'].map(v => (
                <Pressable key={v} style={[styles.smallPill, pushPull === v.replace('+', '') && styles.pillActive]}
                  onPress={() => setPushPull(v.replace('+', ''))}>
                  <Text style={[styles.pillText, pushPull === v.replace('+', '') && styles.pillTextActive]}>{v}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
        </View>
      </View>

      {/* Steps */}
      <Text style={styles.sectionTitle}>Steps</Text>
      {steps.map((step, i) => (
        <View key={step.key} style={styles.stepCard}>
          <View style={styles.stepCardHeader}>
            <Text style={styles.stepNum}>Step {i + 1}</Text>
            {steps.length > 1 && (
              <Pressable onPress={() => removeStep(step.key)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            )}
          </View>

          <TextInput
            style={styles.input}
            value={step.name}
            onChangeText={v => updateStep(step.key, { name: v })}
            placeholder="Step name (e.g. Developer)"
            placeholderTextColor="#aaa"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Duration (s)</Text>
              <TextInput style={styles.input} value={step.duration_seconds}
                onChangeText={v => updateStep(step.key, { duration_seconds: v })}
                keyboardType="numeric" placeholder="60" placeholderTextColor="#aaa" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Temp (°C)</Text>
              <TextInput style={styles.input} value={step.temperature_c}
                onChangeText={v => updateStep(step.key, { temperature_c: v })}
                keyboardType="numeric" placeholder="Optional" placeholderTextColor="#aaa" />
            </View>
          </View>

          {/* Chemical picker */}
          <Pressable
            style={[styles.chemPicker, step.chemical_id && styles.chemPickerSelected]}
            onPress={() => setChemPickerStepKey(step.key)}
          >
            <Text style={[styles.chemPickerText, !step.chemical_id && styles.chemPickerPlaceholder]}>
              {step.chemical_name ?? (chemicals.length ? 'Assign chemical…' : 'No chemicals logged for this process')}
            </Text>
            {step.chemical_id && (
              <Pressable
                hitSlop={8}
                onPress={() => updateStep(step.key, { chemical_id: undefined, chemical_name: undefined })}
              >
                <Text style={styles.clearBtn}>✕</Text>
              </Pressable>
            )}
            {!step.chemical_id && <Text style={styles.chemChevron}>›</Text>}
          </Pressable>

          <TextInput style={styles.input} value={step.agitation_notes}
            onChangeText={v => updateStep(step.key, { agitation_notes: v })}
            placeholder="Agitation notes (optional)" placeholderTextColor="#aaa" />
        </View>
      ))}

      <Pressable style={styles.addStepBtn} onPress={addStep}>
        <Text style={styles.addStepText}>+ Add Step</Text>
      </Pressable>

      <Field label="Notes">
        <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes}
          multiline numberOfLines={3} placeholder="Optional notes…" placeholderTextColor="#aaa" />
      </Field>

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Procedure'}</Text>
      </Pressable>

      {/* Film stock modal */}
      <SelectModal
        visible={filmStockOpen}
        title="Film Stock"
        options={filmStockOptions}
        selected={filmStock}
        allowCustom
        onSelect={setFilmStock}
        onClose={() => setFilmStockOpen(false)}
      />

      {/* Per-step chemical modal */}
      <SelectModal
        visible={chemPickerStepKey !== null}
        title={activePickerStep ? `Chemical for Step ${steps.indexOf(activePickerStep) + 1}` : 'Chemical'}
        options={chemOptions}
        selected={activePickerStep?.chemical_id ? String(activePickerStep.chemical_id) : undefined}
        onSelect={value => {
          if (chemPickerStepKey === null) return;
          const chem = chemicals.find(c => c.id === Number(value));
          if (chem) updateStep(chemPickerStepKey, { chemical_id: chem.id, chemical_name: chem.name });
        }}
        onClose={() => setChemPickerStepKey(null)}
      />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#f9fafb' },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  subLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#111', borderWidth: 1, borderColor: '#e5e7eb',
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: 'transparent',
  },
  smallPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: 'transparent',
  },
  pillActive: { backgroundColor: '#1a1a1a' },
  pillText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  stepCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  stepCardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#374151' },
  removeText: { fontSize: 13, color: '#ef4444' },
  chemPicker: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  chemPickerSelected: { borderColor: '#1a1a1a', backgroundColor: '#f0fdf4' },
  chemPickerText: { flex: 1, fontSize: 14, color: '#111' },
  chemPickerPlaceholder: { color: '#aaa' },
  chemChevron: { fontSize: 20, color: '#9ca3af', lineHeight: 22 },
  clearBtn: { fontSize: 13, color: '#9ca3af', paddingHorizontal: 4 },
  addStepBtn: {
    borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed',
    borderRadius: 10, padding: 14, alignItems: 'center',
  },
  addStepText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
