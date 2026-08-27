import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { api } from '../../src/api/client';
import { Procedure } from '../../src/types';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export default function ProcedureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [procedure, setProcedure] = useState<Procedure | null>(null);

  useEffect(() => {
    if (!id) return;
    api.procedures.get(Number(id)).then(p => {
      setProcedure(p);
      navigation.setOptions({ title: p.name });
    }).catch(console.error);
  }, [id]);

  async function deleteProcedure() {
    if (!procedure) return;
    Alert.alert('Delete Procedure', `Delete "${procedure.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.procedures.delete(procedure.id);
            router.back();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  }

  if (!procedure) return <View style={styles.loading}><Text style={styles.loadingText}>Loading…</Text></View>;

  const totalSeconds = procedure.steps.reduce((s, step) => s + step.duration_seconds, 0);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{procedure.name}</Text>
        <Text style={styles.meta}>{procedure.process_name}</Text>
        {procedure.film_stock && <Text style={styles.sub}>{procedure.film_stock}</Text>}
        {procedure.developer && <Text style={styles.sub}>Developer: {procedure.developer}</Text>}
        {procedure.temperature_c != null && <Text style={styles.sub}>{procedure.temperature_c}°C</Text>}
        {procedure.push_pull !== 0 && (
          <Text style={[styles.sub, { color: procedure.push_pull > 0 ? '#ef4444' : '#3b82f6' }]}>
            {procedure.push_pull > 0 ? '+' : ''}{procedure.push_pull} stops
          </Text>
        )}
        <Text style={styles.totalTime}>Total: {formatDuration(totalSeconds)}</Text>
        <Text style={styles.rollCount}>
          {procedure.rolls_processed} {procedure.rolls_processed === 1 ? 'roll' : 'rolls'} processed
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Steps</Text>
        {procedure.steps.map((step, i) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepName}>{step.name}</Text>
              {step.chemical_name && <Text style={[styles.stepSub, styles.stepChemical]}>🧪 {step.chemical_name}</Text>}
              {step.temperature_c != null && <Text style={styles.stepSub}>{step.temperature_c}°C</Text>}
              {step.agitation_notes && <Text style={styles.stepSub}>{step.agitation_notes}</Text>}
            </View>
            <Text style={styles.stepDuration}>{formatDuration(step.duration_seconds)}</Text>
          </View>
        ))}
      </View>

      {procedure.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{procedure.notes}</Text>
        </View>
      )}

      <Pressable
        style={styles.timerBtn}
        onPress={() => router.push(`/timer/${procedure.id}`)}
      >
        <Text style={styles.timerBtnText}>▶ Start Dev Timer</Text>
      </Pressable>

      <Pressable style={styles.deleteBtn} onPress={deleteProcedure}>
        <Text style={styles.deleteBtnText}>Delete Procedure</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#f9fafb' },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9ca3af' },
  header: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#111' },
  meta: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  sub: { fontSize: 13, color: '#9ca3af' },
  totalTime: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginTop: 8 },
  rollCount: { fontSize: 13, color: '#6b7280' },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepInfo: { flex: 1, gap: 2 },
  stepName: { fontSize: 15, fontWeight: '600', color: '#111' },
  stepSub: { fontSize: 12, color: '#6b7280' },
  stepChemical: { color: '#059669', fontWeight: '500' },
  stepDuration: { fontSize: 14, fontWeight: '700', color: '#374151', fontVariant: ['tabular-nums'] },
  notes: { fontSize: 14, color: '#374151', lineHeight: 20 },
  timerBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 18, alignItems: 'center',
  },
  timerBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  deleteBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#fca5a5',
  },
  deleteBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
