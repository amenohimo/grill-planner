import type { DirectionStats } from '@/types';

interface DirectionStatsTableProps {
  stats: readonly DirectionStats[];
  totalGrillCount: number;
}

export function DirectionStatsTable({ stats, totalGrillCount }: DirectionStatsTableProps) {
  // 同名方面の集約
  const nameAgg = new Map<string, { spawnCount: number; defeatCount: number }>();
  for (const s of stats) {
    const existing = nameAgg.get(s.direction) ?? { spawnCount: 0, defeatCount: 0 };
    nameAgg.set(s.direction, {
      spawnCount: existing.spawnCount + s.spawnCount,
      defeatCount: existing.defeatCount + s.defeatCount,
    });
  }
  const hasDuplicateNames = nameAgg.size < stats.length;

  const totalDefeatCount = stats.reduce((sum, s) => sum + s.defeatCount, 0);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-text">方面別統計</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-muted">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">方面</th>
            <th className="py-1 text-right">湧き</th>
            <th className="py-1 text-right">撃破</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} className="border-b border-border">
              <td className="py-1 pr-2 text-xs text-text-muted">{i + 1}</td>
              <td className="py-1 pr-2 text-text">{s.direction}</td>
              <td className="py-1 text-right font-medium text-text">{s.spawnCount}</td>
              <td className="py-1 text-right font-medium text-text">{s.defeatCount}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-1 pr-2"></td>
            <td className="py-1 pr-2 text-text">合計</td>
            <td className="py-1 text-right text-text">{totalGrillCount}</td>
            <td className="py-1 text-right text-text">{totalDefeatCount}</td>
          </tr>
        </tbody>
      </table>

      {/* 同名方面の集約表示 */}
      {hasDuplicateNames && (
        <div className="mt-3 border-t border-border pt-2">
          <h4 className="mb-1 text-xs font-medium text-text-muted">方面名別合計</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="py-1 pr-2">方面</th>
                <th className="py-1 text-right">湧き</th>
                <th className="py-1 text-right">撃破</th>
              </tr>
            </thead>
            <tbody>
              {[...nameAgg.entries()].map(([name, counts]) => (
                <tr key={name}>
                  <td className="py-1 pr-2 text-text">{name}</td>
                  <td className="py-1 text-right font-medium text-text">{counts.spawnCount}</td>
                  <td className="py-1 text-right font-medium text-text">{counts.defeatCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
