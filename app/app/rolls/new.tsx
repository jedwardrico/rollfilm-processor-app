import { useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/api/client';
import { Process, RollFormat } from '../../src/types';

const FORMATS: RollFormat[] = ['135', '120', '4x5', 'other'];

export default function NewRollScreen() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [filmStock, setFilmStock] = useState('');
  const [format, setFormat] = useState<RollFormat>('135');
  const [processId, setProcessId] = useState('C41');
  const [frames, setFrames] = useState('36');
  const [dateShot, setDateShot] = useState(() => new Date().toISOString().split('T')[0]);
  const [pushPull, setPushPull] = useState('0');
  const [notes, setNotes] = useState('');
  const [binderLocation, setBinderLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.processes.list().then(setProcesses).catch(console.error);
  }, []);

  async function save() {
    if (!filmStock.trim()) { Alert.alert('Film stock is required'); return; }
    setSaving(true);
    try {
      await api.rolls.create({
        film_stock: filmStock.trim(),
        format,
        process_id: processId,
        frames: frames ? Number(frames) : undefined,
        date_shot: dateShot || undefined,
        push_pull: Number(pushPull),
        notes: notes || undefined,
        binder_location: binderLocation || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Film Stock *">
        <TextInput style={styles.input} value={filmStock} onChangeText={setFilmStock}
          placeholder="e.g. Kodak Portra 400" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Format">
        <View style={styles.pills}>
          {FORMATS.map(f => (
            <Pressable key={f} style={[styles.pill, format === f && styles.pillActive]} onPress={() => setFormat(f)}>
              <Text style={[styles.pillText, format === f && styles.pillTextActive]}>{f}mm</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Process">
        <View style={styles.pills}>
          {processes.map(p => (
            <Pressable key={p.id} style={[styles.pill, processId === p.id && styles.pillActive]} onPress={() => setProcessId(p.id)}>
              <Text style={[styles.pillText, processId === p.id && styles.pillTextActive]}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Frames">
        <TextInput style={styles.input} value={frames} onChangeText={setFrames}
          keyboardType="numeric" placeholder="36" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Date Shot (YYYY-MM-DD)">
        <TextInput style={styles.input} value={dateShot} onChangeText={setDateShot}
          placeholder="2026-08-26" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Push/Pull (stops)">
        <View style={styles.pills}>
          {['-2', '-1', '0', '+1', '+2', '+3'].map(v => (
            <Pressable key={v} style={[styles.pill, pushPull === v.replace('+', '') && styles.pillActive]}
              onPress={() => setPushPull(v.replace('+', ''))}>
              <Text style={[styles.pillText, pushPull === v.replace('+', '') && styles.pillTextActive]}>{v}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Binder Location">
        <TextInput style={styles.input} value={binderLocation} onChangeText={setBinderLocation}
          placeholder="e.g. Binder 3, Sheet 12" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Notes">
        <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes}
          placeholder="Any notes..." placeholderTextColor="#aaa" multiline numberOfLines={3} />
      </Field>

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Log Roll'}</Text>
      </Pressable>
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
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#111', borderWidth: 1, borderColor: '#e5e7eb',
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: 'transparent',
  },
  pillActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  pillText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
