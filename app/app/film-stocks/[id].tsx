import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { api } from '../../src/api/client';
import { FilmStock, Process } from '../../src/types';

export default function EditFilmStockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const [processes, setProcesses] = useState<Process[]>([]);
  const [stock, setStock] = useState<FilmStock | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [iso, setIso] = useState('');
  const [processId, setProcessId] = useState('C41');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.processes.list().then(setProcesses).catch(console.error);
  }, []);

  useEffect(() => {
    if (!id) return;
    api.filmStocks.get(Number(id)).then(s => {
      setStock(s);
      setBrand(s.brand);
      setName(s.name);
      setIso(s.iso != null ? String(s.iso) : '');
      setProcessId(s.process_id);
      setNotes(s.notes ?? '');
      navigation.setOptions({ title: `${s.brand} ${s.name}` });
    }).catch(console.error);
  }, [id]);

  async function save() {
    if (!brand.trim()) { Alert.alert('Brand is required'); return; }
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    if (!stock) return;
    setSaving(true);
    try {
      await api.filmStocks.update(stock.id, {
        brand: brand.trim(),
        name: name.trim(),
        iso: iso ? Number(iso) : undefined,
        process_id: processId,
        notes: notes || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!stock) return;
    const next = stock.active ? 0 : 1;
    const label = next ? 'Reactivate' : 'Retire';
    Alert.alert(`${label} film stock?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: next ? 'default' : 'destructive',
        onPress: async () => {
          try {
            const updated = await api.filmStocks.update(stock.id, { active: next });
            setStock(updated);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  if (!stock) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Loading…</Text></View>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Brand *">
        <TextInput style={styles.input} value={brand} onChangeText={setBrand}
          placeholder="e.g. Kodak" placeholderTextColor="#aaa" />
      </Field>

      <Field label="Name *">
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="e.g. Portra 400" placeholderTextColor="#aaa" />
      </Field>

      <Field label="ISO">
        <TextInput style={styles.input} value={iso} onChangeText={setIso}
          keyboardType="numeric" placeholder="e.g. 400" placeholderTextColor="#aaa" />
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

      <Field label="Notes">
        <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes}
          multiline numberOfLines={3} placeholder="Optional notes…" placeholderTextColor="#aaa" />
      </Field>

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
      </Pressable>

      <Pressable style={[styles.retireBtn, !stock.active && styles.reactivateBtn]} onPress={toggleActive}>
        <Text style={[styles.retireBtnText, !stock.active && styles.reactivateBtnText]}>
          {stock.active ? 'Retire Film Stock' : 'Reactivate Film Stock'}
        </Text>
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9ca3af' },
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
  retireBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#ef4444',
  },
  reactivateBtn: { borderColor: '#10b981' },
  retireBtnText: { fontSize: 16, fontWeight: '600', color: '#ef4444' },
  reactivateBtnText: { color: '#10b981' },
});
