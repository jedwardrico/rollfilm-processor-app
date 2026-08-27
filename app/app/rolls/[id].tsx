import { useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { api } from '../../src/api/client';
import { Chemical, Procedure, Roll, RollStatus } from '../../src/types';

const STATUS_SEQUENCE: RollStatus[] = ['shot', 'processing', 'processed', 'scanning', 'scanned', 'archived'];
const STATUS_LABELS: Record<RollStatus, string> = {
  shot: 'Needs Processing',
  processing: 'In Development',
  processed: 'Needs Scanning',
  scanning: 'Scanning',
  scanned: 'Scanned',
  archived: 'Archived',
};

function InfoRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function RollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [roll, setRoll] = useState<Roll | null>(null);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedChem, setSelectedChem] = useState<number | undefined>();
  const [selectedProc, setSelectedProc] = useState<number | undefined>();

  useEffect(() => {
    if (!id) return;
    api.rolls.get(id).then(r => {
      setRoll(r);
      setSelectedChem(r.chemical_id);
      setSelectedProc(r.procedure_id ?? undefined);
      navigation.setOptions({ title: r.human_id });
      // Load relevant chemicals and procedures
      api.chemicals.list({ process_id: r.process_id, active: true }).then(setChemicals);
      api.procedures.list({ process_id: r.process_id }).then(setProcedures);
    }).catch(console.error);
  }, [id]);

  async function advanceStatus() {
    if (!roll) return;
    const idx = STATUS_SEQUENCE.indexOf(roll.status);
    const next = STATUS_SEQUENCE[idx + 1];
    if (!next) return;

    try {
      let updated: Roll;
      if (next === 'processed') {
        updated = await api.rolls.process(roll.id, {
          chemical_id: selectedChem,
          procedure_id: selectedProc,
        });
      } else {
        const patch: Partial<Roll> = { status: next };
        if (next === 'scanned') patch.date_scanned = new Date().toISOString().split('T')[0];
        updated = await api.rolls.update(roll.id, patch);
      }
      setRoll(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  const nextStatus = roll ? STATUS_SEQUENCE[STATUS_SEQUENCE.indexOf(roll.status) + 1] : null;

  if (!roll) return <View style={styles.loading}><Text style={styles.loadingText}>Loading…</Text></View>;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* ID Header */}
      <View style={styles.idBlock}>
        <Text style={styles.humanId}>{roll.human_id}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{STATUS_LABELS[roll.status]}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <InfoRow label="Film" value={roll.film_stock} />
        <InfoRow label="Format" value={`${roll.format}mm`} />
        <InfoRow label="Process" value={roll.process_name} />
        <InfoRow label="Exposures" value={roll.exposures} />
        <InfoRow label="Date Shot" value={roll.date_shot} />
        <InfoRow label="Date Processed" value={roll.date_processed} />
        <InfoRow label="Date Scanned" value={roll.date_scanned} />
        <InfoRow label="Push/Pull" value={roll.push_pull !== 0 ? `${roll.push_pull > 0 ? '+' : ''}${roll.push_pull} stops` : null} />
        <InfoRow label="Binder" value={roll.binder_location} />
        <InfoRow label="Notes" value={roll.notes} />
      </View>

      {/* Chemical assignment (for unprocessed rolls) */}
      {(roll.status === 'shot' || roll.status === 'processing') && chemicals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chemical Set</Text>
          {chemicals.map(c => (
            <Pressable key={c.id} style={[styles.selectRow, selectedChem === c.id && styles.selectRowActive]}
              onPress={() => setSelectedChem(c.id)}>
              <Text style={styles.selectRowText}>{c.name}</Text>
              {c.capacity_rolls && (
                <Text style={styles.selectRowSub}>{c.rolls_processed}/{c.capacity_rolls} rolls</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Procedure assignment */}
      {(roll.status === 'shot' || roll.status === 'processing') && procedures.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Procedure</Text>
          {procedures.map(p => (
            <Pressable key={p.id} style={[styles.selectRow, selectedProc === p.id && styles.selectRowActive]}
              onPress={() => setSelectedProc(p.id)}>
              <Text style={styles.selectRowText}>{p.name}</Text>
              {selectedProc === p.id && (
                <Pressable style={styles.timerBtn}
                  onPress={() => router.push(`/timer/${p.id}`)}>
                  <Text style={styles.timerBtnText}>▶ Start Timer</Text>
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Advance status */}
      {nextStatus && (
        <Pressable style={styles.advanceBtn} onPress={advanceStatus}>
          <Text style={styles.advanceBtnText}>
            Mark as {STATUS_LABELS[nextStatus]}
          </Text>
        </Pressable>
      )}

      <Pressable style={styles.editBtn} onPress={() => router.push(`/rolls/edit/${roll.id}`)}>
        <Text style={styles.editBtnText}>Edit Roll</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#f9fafb' },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9ca3af' },
  idBlock: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  humanId: { fontSize: 28, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  statusBadge: { backgroundColor: '#1a1a1a', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, color: '#111', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 16 },
  selectRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  selectRowActive: { borderColor: '#1a1a1a', backgroundColor: '#f0fdf4' },
  selectRowText: { fontSize: 14, color: '#111', fontWeight: '500' },
  selectRowSub: { fontSize: 12, color: '#6b7280' },
  timerBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  timerBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  advanceBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 18, alignItems: 'center',
  },
  advanceBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  editBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db',
  },
  editBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
});
