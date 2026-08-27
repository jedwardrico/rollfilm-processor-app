import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { Procedure } from '../../src/types';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function ProcedureCard({ proc }: { proc: Procedure }) {
  const totalSeconds = proc.steps.reduce((sum, s) => sum + s.duration_seconds, 0);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/procedures/${proc.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.procName}>{proc.name}</Text>
        <Text style={styles.totalTime}>{formatDuration(totalSeconds)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.procMeta}>{proc.process_name}</Text>
        <Text style={styles.rollCount}>{proc.rolls_processed} {proc.rolls_processed === 1 ? 'roll' : 'rolls'}</Text>
      </View>
      {proc.film_stock && <Text style={styles.sub}>{proc.film_stock}</Text>}
      {proc.developer && <Text style={styles.sub}>Developer: {proc.developer}</Text>}
      {proc.temperature_c != null && <Text style={styles.sub}>{proc.temperature_c}°C</Text>}
      {proc.push_pull !== 0 && (
        <Text style={[styles.sub, { color: proc.push_pull > 0 ? '#ef4444' : '#3b82f6' }]}>
          {proc.push_pull > 0 ? `+${proc.push_pull}` : proc.push_pull} stops
        </Text>
      )}
      <View style={styles.steps}>
        {proc.steps.slice(0, 4).map(s => (
          <View key={s.id} style={styles.stepPill}>
            <Text style={styles.stepText}>{s.name} · {formatDuration(s.duration_seconds)}</Text>
          </View>
        ))}
        {proc.steps.length > 4 && (
          <Text style={styles.moreSteps}>+{proc.steps.length - 4} more</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function ProceduresScreen() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.procedures.list();
      setProcedures(data);
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={procedures}
        keyExtractor={p => String(p.id)}
        renderItem={({ item }) => <ProcedureCard proc={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No procedures yet.</Text>}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/procedures/new')}>
        <Text style={styles.fabText}>+ New Procedure</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 12, gap: 10, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  procName: { fontSize: 16, fontWeight: '600', color: '#111', flex: 1 },
  totalTime: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  procMeta: { fontSize: 13, color: '#6b7280' },
  rollCount: { fontSize: 12, color: '#9ca3af', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  stepPill: { backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  stepText: { fontSize: 12, color: '#374151' },
  moreSteps: { fontSize: 12, color: '#9ca3af', alignSelf: 'center' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: '#1a1a1a', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
