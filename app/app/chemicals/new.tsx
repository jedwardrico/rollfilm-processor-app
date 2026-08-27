import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/api/client';
import { ChemicalRole, Process } from '../../src/types';

const ROLES: ChemicalRole[] = ['developer', 'stop', 'fixer', 'bleach', 'blix', 'stabilizer', 'wash', 'other'];

export default function NewChemicalScreen() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [name, setName] = useState('');
  const [processId, setProcessId] = useState('C41');
  const [role, setRole] = useState<ChemicalRole>('developer');
  const [capacityRolls, setCapacityRolls] = useState('');
  const [volumeMl, setVolumeMl] = useState('');
  const [dateMixed, setDateMixed] = useState(() => new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.processes.list().then(setProcesses).catch(console.error); }, []);

  async function save() {
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    setSaving(true);
    try {
      await api.chemicals.create({
        name: name.trim(),
        process_id: processId,
        role,
        capacity_rolls: capacityRolls ? Number(capacityRolls) : undefined,
        volume_ml: volumeMl ? Number(volumeMl) : undefined,
        date_mixed: dateMixed || undefined,
        expiry_date: expiryDate || undefined,
        notes: notes || undefined,
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
      <Field label="Name *">
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="e.g. Kodak C-41 Developer Kit" placeholderTextColor="#aaa" />
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

      <Field label="Role">
        <View style={styles.pills}>
          {ROLES.map(r => (
            <Pressable key={r} style={[styles.pill, role === r && styles.pillActive]}
              onPress={() => setRole(r)}>
              <Text style={[styles.pillText, role === r && styles.pillTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Capacity (rolls)">
        <TextInput style={styles.input} value={capacityRolls} onChangeText={setCapacityRolls}
          keyboardType="numeric" placeholder="e.g. 8" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Volume (ml)">
        <TextInput style={styles.input} value={volumeMl} onChangeText={setVolumeMl}
          keyboardType="numeric" placeholder="e.g. 1000" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Date Mixed (YYYY-MM-DD)">
        <TextInput style={styles.input} value={dateMixed} onChangeText={setDateMixed}
          placeholder="2026-08-26" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Expiry Date (YYYY-MM-DD)">
        <TextInput style={styles.input} value={expiryDate} onChangeText={setExpiryDate}
          placeholder="Optional" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Notes">
        <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes}
          multiline numberOfLines={3} placeholder="Optional notes…" placeholderTextColor="#aaa" />
      </Field>

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Add Chemical'}</Text>
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
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: 'transparent',
  },
  pillActive: { backgroundColor: '#1a1a1a' },
  pillText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
