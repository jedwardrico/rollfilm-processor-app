import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { Stats } from '../../src/types';

const STATUS_COLORS: Record<string, string> = {
  shot: '#f59e0b',
  processing: '#3b82f6',
  processed: '#8b5cf6',
  scanning: '#06b6d4',
  scanned: '#10b981',
  archived: '#9ca3af',
};

const STATUS_LABELS: Record<string, string> = {
  shot: 'Needs Processing',
  processing: 'In Dev',
  processed: 'Needs Scanning',
  scanning: 'Scanning',
  scanned: 'Scanned',
  archived: 'Archived',
};

function StatTile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {sub && <Text style={styles.tileSub}>{sub}</Text>}
    </View>
  );
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <View style={styles.hbarRow}>
      <Text style={styles.hbarLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.hbarTrack}>
        <View style={[styles.hbarFill, { width: `${pct * 100}%` as any, backgroundColor: color ?? '#1a1a1a' }]} />
      </View>
      <Text style={styles.hbarValue}>{value}</Text>
    </View>
  );
}

function MonthChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <View style={styles.monthChart}>
      {data.map(d => {
        const pct = d.count / max;
        const label = d.month.slice(5); // MM
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthName = months[parseInt(label, 10) - 1] ?? label;
        return (
          <View key={d.month} style={styles.monthCol}>
            <Text style={styles.monthCount}>{d.count || ''}</Text>
            <View style={styles.monthBarTrack}>
              <View style={[styles.monthBarFill, { height: `${pct * 100}%` as any }]} />
            </View>
            <Text style={styles.monthLabel}>{monthName}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.stats.get();
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Can't connect to server</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    );
  }

  if (!stats) {
    return <View style={styles.center}><Text style={styles.loadingText}>Loading stats…</Text></View>;
  }

  const maxProcess = Math.max(...stats.byProcess.map(p => p.count), 1);
  const maxFilm = Math.max(...stats.topFilmStocks.map(f => f.count), 1);
  const pipelineTotal = stats.pipeline.reduce((s, p) => s + p.count, 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Summary tiles */}
      <View style={styles.tileRow}>
        <StatTile label="Total Rolls" value={stats.totals.total_rolls} />
        <StatTile label="Scanned" value={stats.totals.scanned} />
        <StatTile label="In Queue" value={stats.totals.awaiting_dev} sub="needs dev" />
        <StatTile label="Chemicals" value={`${stats.totals.active}`} sub="active" />
      </View>

      {/* Pipeline */}
      {pipelineTotal > 0 && (
        <Section title="Pipeline">
          <View style={styles.pipeline}>
            {stats.pipeline.map(p => {
              const pct = pipelineTotal > 0 ? p.count / pipelineTotal : 0;
              const color = STATUS_COLORS[p.status] ?? '#6b7280';
              return (
                <View key={p.status} style={[styles.pipelineSegment, { flex: pct || 0.01, backgroundColor: color }]} />
              );
            })}
          </View>
          <View style={styles.pipelineLegend}>
            {stats.pipeline.map(p => (
              <View key={p.status} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[p.status] ?? '#6b7280' }]} />
                <Text style={styles.legendText}>{STATUS_LABELS[p.status] ?? p.status} ({p.count})</Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Rolls by month */}
      {stats.byMonth.length > 0 && (
        <Section title="Rolls Logged (Last 12 Months)">
          <MonthChart data={stats.byMonth} />
        </Section>
      )}

      {/* By process */}
      {stats.byProcess.some(p => p.count > 0) && (
        <Section title="By Process">
          {stats.byProcess.filter(p => p.count > 0).map(p => (
            <HBar key={p.process_id} label={p.process_name} value={p.count} max={maxProcess} />
          ))}
        </Section>
      )}

      {/* Top film stocks */}
      {stats.topFilmStocks.length > 0 && (
        <Section title="Top Film Stocks">
          {stats.topFilmStocks.map(f => (
            <HBar key={f.film_stock} label={f.film_stock} value={f.count} max={maxFilm} color="#374151" />
          ))}
        </Section>
      )}

      {/* Chemical utilization */}
      {stats.chemUtilization.length > 0 && (
        <Section title="Chemical Utilization">
          {stats.chemUtilization.map(c => {
            const pct = c.pct_used ?? 0;
            const color = pct >= 100 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981';
            return (
              <View key={c.name} style={styles.chemRow}>
                <View style={styles.chemInfo}>
                  <Text style={styles.chemName}>{c.name}</Text>
                  <Text style={styles.chemSub}>{c.process_name}</Text>
                </View>
                <View style={styles.chemBar}>
                  <View style={[styles.chemBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
                </View>
                <Text style={[styles.chemPct, { color }]}>{Math.round(pct)}%</Text>
              </View>
            );
          })}
        </Section>
      )}

      {stats.totals.total_rolls === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No data yet. Log your first roll to see stats.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#f9fafb' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: '#9ca3af', fontSize: 15 },
  errorText: { fontSize: 16, fontWeight: '600', color: '#ef4444' },
  errorSub: { fontSize: 13, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 15, textAlign: 'center' },

  tileRow: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  tileValue: { fontSize: 26, fontWeight: '800', color: '#111', fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textAlign: 'center', marginTop: 2 },
  tileSub: { fontSize: 10, color: '#9ca3af', marginTop: 1 },

  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },

  pipeline: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 1 },
  pipelineSegment: { borderRadius: 2 },
  pipelineLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#374151' },

  monthChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 },
  monthCol: { flex: 1, alignItems: 'center', gap: 4 },
  monthCount: { fontSize: 10, color: '#6b7280', fontVariant: ['tabular-nums'] },
  monthBarTrack: { flex: 1, width: '100%', backgroundColor: '#f3f4f6', borderRadius: 3, justifyContent: 'flex-end' },
  monthBarFill: { backgroundColor: '#1a1a1a', borderRadius: 3, width: '100%' },
  monthLabel: { fontSize: 9, color: '#9ca3af' },

  hbarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hbarLabel: { width: 120, fontSize: 13, color: '#374151' },
  hbarTrack: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4 },
  hbarFill: { height: 8, borderRadius: 4, backgroundColor: '#1a1a1a' },
  hbarValue: { width: 28, fontSize: 13, color: '#374151', fontWeight: '600', textAlign: 'right', fontVariant: ['tabular-nums'] },

  chemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chemInfo: { width: 120 },
  chemName: { fontSize: 13, fontWeight: '500', color: '#111' },
  chemSub: { fontSize: 11, color: '#9ca3af' },
  chemBar: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  chemBarFill: { height: 8, borderRadius: 4 },
  chemPct: { width: 36, fontSize: 12, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
});
