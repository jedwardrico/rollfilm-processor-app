import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { Roll, RollStatus } from '../../src/types';

const STATUS_LABELS: Record<RollStatus, string> = {
  shot: 'Needs Processing',
  processing: 'In Dev',
  processed: 'Needs Scanning',
  scanning: 'Scanning',
  scanned: 'Done',
  archived: 'Archived',
};

const STATUS_COLORS: Record<RollStatus, string> = {
  shot: '#f59e0b',
  processing: '#3b82f6',
  processed: '#8b5cf6',
  scanning: '#06b6d4',
  scanned: '#10b981',
  archived: '#9ca3af',
};

const FILTERS: { label: string; value: string | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Queue', value: 'shot' },
  { label: 'Processed', value: 'processed' },
  { label: 'Scanned', value: 'scanned' },
];

function RollCard({ roll }: { roll: Roll }) {
  const color = STATUS_COLORS[roll.status];
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/rolls/${roll.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.humanId}>{roll.human_id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[roll.status]}</Text>
        </View>
      </View>
      <Text style={styles.filmStock}>{roll.film_stock}</Text>
      <View style={styles.cardMeta}>
        <Text style={styles.meta}>{roll.format}mm · {roll.process_name}</Text>
        {roll.push_pull !== 0 && (
          <Text style={[styles.meta, { color: roll.push_pull > 0 ? '#ef4444' : '#3b82f6' }]}>
            {roll.push_pull > 0 ? `+${roll.push_pull}` : roll.push_pull} stops
          </Text>
        )}
      </View>
      {roll.date_shot && <Text style={styles.date}>Shot {roll.date_shot}</Text>}
    </Pressable>
  );
}

export default function RollsScreen() {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (statusFilter?: string) => {
    try {
      const data = await api.rolls.list({ status: statusFilter });
      setRolls(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(filter); }, [filter, load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(filter);
    setRefreshing(false);
  }, [filter, load]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.label}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={rolls}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => <RollCard roll={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No rolls found.</Text>}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/rolls/new')}>
        <Text style={styles.fabText}>+ Log Roll</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  filterText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 12, gap: 10, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  humanId: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '600' },
  filmStock: { fontSize: 16, fontWeight: '500', color: '#111', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  meta: { fontSize: 13, color: '#6b7280' },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: '#1a1a1a', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
