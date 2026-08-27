import { useCallback, useState } from 'react';
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { FilmStock } from '../../src/types';

function FilmStockCard({ stock }: { stock: FilmStock }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, !stock.active && styles.cardInactive, pressed && styles.cardPressed]}
      onPress={() => router.push(`/film-stocks/${stock.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.stockName}>{stock.brand} {stock.name}</Text>
        {stock.iso != null && (
          <Text style={styles.iso}>ISO {stock.iso}</Text>
        )}
      </View>
      <Text style={styles.process}>{stock.process_name}</Text>
      {stock.notes ? <Text style={styles.notes}>{stock.notes}</Text> : null}
    </Pressable>
  );
}

export default function FilmStocksScreen() {
  const [stocks, setStocks] = useState<FilmStock[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.filmStocks.list(showInactive ? {} : { active: true });
      setStocks(data);
    } catch (e) { console.error(e); }
  }, [showInactive]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => setShowInactive(v => !v)}>
          <Text style={styles.toggleText}>{showInactive ? 'Hide retired' : 'Show retired'}</Text>
        </Pressable>
      </View>
      <FlatList
        data={stocks}
        keyExtractor={s => String(s.id)}
        renderItem={({ item }) => <FilmStockCard stock={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No film stocks added yet.</Text>}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/film-stocks/new')}>
        <Text style={styles.fabText}>+ Add Film Stock</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  stockName: { fontSize: 16, fontWeight: '600', color: '#111', flex: 1 },
  iso: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  process: { fontSize: 13, color: '#6b7280' },
  notes: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: '#1a1a1a', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
