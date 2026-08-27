import { useCallback, useState } from 'react';
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { Chemical } from '../../src/types';

function usageColor(rolls: number, cap?: number) {
  if (!cap) return '#6b7280';
  const pct = rolls / cap;
  if (pct >= 1) return '#ef4444';
  if (pct >= 0.75) return '#f59e0b';
  return '#10b981';
}

function UsageBar({ rolls, cap }: { rolls: number; cap?: number }) {
  if (!cap) return null;
  const pct = Math.min(rolls / cap, 1);
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: usageColor(rolls, cap) }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginTop: 8 },
  fill: { height: 4, borderRadius: 2 },
});

function ChemCard({ chem, onIncrement }: { chem: Chemical; onIncrement: () => void }) {
  const exhausted = chem.capacity_rolls != null && chem.rolls_processed >= chem.capacity_rolls;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, !chem.active && styles.cardInactive, pressed && styles.cardPressed]}
      onPress={() => router.push(`/chemicals/${chem.id}`)}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.chemName}>{chem.name}</Text>
          <Text style={styles.chemMeta}>{chem.process_name} · {chem.role}</Text>
        </View>
        {!exhausted && chem.active === 1 && (
          <Pressable style={styles.incBtn} onPress={onIncrement}>
            <Text style={styles.incBtnText}>+1 roll</Text>
          </Pressable>
        )}
        {exhausted && <Text style={styles.exhaustedBadge}>Exhausted</Text>}
      </View>
      {chem.capacity_rolls != null && (
        <Text style={[styles.usageText, { color: usageColor(chem.rolls_processed, chem.capacity_rolls) }]}>
          {chem.rolls_processed} / {chem.capacity_rolls} rolls
        </Text>
      )}
      <UsageBar rolls={chem.rolls_processed} cap={chem.capacity_rolls} />
      {chem.date_mixed && <Text style={styles.date}>Mixed {chem.date_mixed}</Text>}
      {chem.expiry_date && <Text style={styles.date}>Expires {chem.expiry_date}</Text>}
    </Pressable>
  );
}

export default function ChemicalsScreen() {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.chemicals.list(showInactive ? {} : { active: true });
      setChemicals(data);
    } catch (e) { console.error(e); }
  }, [showInactive]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const increment = useCallback(async (id: number) => {
    try {
      const updated = await api.chemicals.increment(id);
      setChemicals(prev => prev.map(c => c.id === id ? updated : c));
    } catch (e) { console.error(e); }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => setShowInactive(v => !v)}>
          <Text style={styles.toggleText}>{showInactive ? 'Hide retired' : 'Show retired'}</Text>
        </Pressable>
      </View>
      <FlatList
        data={chemicals}
        keyExtractor={c => String(c.id)}
        renderItem={({ item }) => <ChemCard chem={item} onIncrement={() => increment(item.id)} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No chemicals logged yet.</Text>}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/chemicals/new')}>
        <Text style={styles.fabText}>+ Add Chemical</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  toolbar: { padding: 12, alignItems: 'flex-end' },
  toggleText: { color: '#6b7280', fontSize: 13 },
  list: { padding: 12, gap: 10, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  cardInactive: { opacity: 0.5 },
  cardPressed: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chemName: { fontSize: 16, fontWeight: '600', color: '#111' },
  chemMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  usageText: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  incBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  incBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  exhaustedBadge: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: '#1a1a1a', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
