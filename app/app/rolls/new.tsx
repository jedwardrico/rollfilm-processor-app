import { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/api/client';
import { FilmStock, Process, RollFormat } from '../../src/types';

const FORMATS: RollFormat[] = ['135', '120', '127', '220', '4x5', 'other'];
const FORMAT_LABELS: Record<RollFormat, string> = {
  '135': '35mm', '120': '120', '127': '127', '220': '220', '4x5': '4x5', 'other': 'other',
};
const FORMAT_DEFAULT_FRAMES: Record<RollFormat, number | undefined> = {
  '135': 36, '120': 8, '127': 8, '220': 16, '4x5': 1, 'other': undefined,
};

export default function NewRollScreen() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [filmStocks, setFilmStocks] = useState<FilmStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<FilmStock | null>(null);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [format, setFormat] = useState<RollFormat>('135');
  const [processId, setProcessId] = useState('C41');
  const [exposures, setExposures] = useState('36');
  const [dateShot, setDateShot] = useState(() => new Date().toISOString().split('T')[0]);
  const [pushPull, setPushPull] = useState('0');
  const [notes, setNotes] = useState('');
  const [binderLocation, setBinderLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.processes.list().then(setProcesses).catch(console.error);
    api.filmStocks.list({ active: true }).then(setFilmStocks).catch(console.error);
  }, []);

  const filteredStocks = useMemo(() => {
    const q = stockSearch.toLowerCase().trim();
    if (!q) return filmStocks;
    return filmStocks.filter(s =>
      s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q)
    );
  }, [filmStocks, stockSearch]);

  function pickStock(stock: FilmStock) {
    setSelectedStock(stock);
    setProcessId(stock.process_id);
    setStockModalVisible(false);
    setStockSearch('');
  }

  async function save() {
    if (!selectedStock) { Alert.alert('Film stock is required'); return; }
    setSaving(true);
    try {
      await api.rolls.create({
        film_stock_id: selectedStock.id,
        film_stock: selectedStock.name,
        format,
        process_id: processId,
        exposures: exposures ? Number(exposures) : undefined,
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

      <View style={styles.field}>
        <Text style={styles.label}>Film Stock *</Text>
        <Pressable style={[styles.stockTrigger, !selectedStock && styles.stockTriggerEmpty]} onPress={() => setStockModalVisible(true)}>
          {selectedStock ? (
            <View style={styles.stockInfo}>
              <Text style={styles.stockName}>{selectedStock.name}</Text>
              <Text style={styles.stockMeta}>ISO {selectedStock.iso ?? '?'} · {selectedStock.process_name}</Text>
            </View>
          ) : (
            <Text style={styles.stockPlaceholder}>Select a film stock…</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Field label="Format">
        <View style={styles.pills}>
          {FORMATS.map(f => (
            <Pressable key={f} style={[styles.pill, format === f && styles.pillActive]} onPress={() => {
              setFormat(f);
              const def = FORMAT_DEFAULT_FRAMES[f];
              setExposures(def !== undefined ? String(def) : '');
            }}>
              <Text style={[styles.pillText, format === f && styles.pillTextActive]}>{FORMAT_LABELS[f]}</Text>
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

      <Field label="Exposures">
        <TextInput style={styles.input} value={exposures} onChangeText={setExposures}
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

      <Modal visible={stockModalVisible} transparent animationType="slide" onRequestClose={() => setStockModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setStockModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Select Film Stock</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={stockSearch}
                onChangeText={setStockSearch}
                placeholder="Search by name or brand…"
                placeholderTextColor="#aaa"
                autoFocus
              />
            </View>
            <FlatList
              data={filteredStocks}
              keyExtractor={s => String(s.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.stockOption, selectedStock?.id === item.id && styles.stockOptionSelected]}
                  onPress={() => pickStock(item)}
                >
                  <View style={styles.stockOptionContent}>
                    <Text style={[styles.stockOptionName, selectedStock?.id === item.id && styles.stockOptionNameSelected]}>
                      {item.name}
                    </Text>
                    <Text style={styles.stockOptionMeta}>ISO {item.iso ?? '?'} · {item.process_name}</Text>
                  </View>
                  {selectedStock?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No film stocks match your search.</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
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

  // Stock trigger
  stockTrigger: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center',
  },
  stockTriggerEmpty: {},
  stockInfo: { flex: 1 },
  stockName: { fontSize: 15, color: '#111', fontWeight: '500' },
  stockMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  stockPlaceholder: { flex: 1, fontSize: 15, color: '#aaa' },
  chevron: { fontSize: 20, color: '#9ca3af', lineHeight: 22 },

  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 40, maxHeight: '80%',
  },
  handle: {
    width: 36, height: 4, backgroundColor: '#d1d5db', borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 15, fontWeight: '700', color: '#111', textAlign: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  searchRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput: {
    backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, color: '#111',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  stockOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  stockOptionSelected: { backgroundColor: '#f0fdf4' },
  stockOptionContent: { flex: 1 },
  stockOptionName: { fontSize: 15, color: '#111' },
  stockOptionNameSelected: { fontWeight: '600', color: '#059669' },
  stockOptionMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  checkmark: { color: '#059669', fontSize: 16, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  emptyText: { textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 14 },
});
