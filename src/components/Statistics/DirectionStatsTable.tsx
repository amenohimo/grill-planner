import type { DirectionId, DirectionStats } from '@/types';

interface DirectionStatsTableProps {
  stats: readonly DirectionStats[];
  totalGrillCount: number;
  presetNames: readonly [string, string, string];
}

export function DirectionStatsTable({ stats, totalGrillCount, presetNames }: DirectionStatsTableProps) {
  const resolveName = (id: DirectionId) => presetNames[id] ?? `方面${id + 1}`;

  // 同名方面の集約（同じDirectionIdごとに集約）
  const idAgg = new Map<DirectionId, { spawnCount: number; defeatCount: number }>();
  for (const s of stats) {
    const existing = idAgg.get(s.direction) ?? { spawnCount: 0, defeatCount: 0 };
    idAgg.set(s.direction, {
      spawnCount: existing.spawnCount + s.spawnCount,
      defeatCount: existing.defeatCount + s.defeatCount,
    });
  }
  const hasDuplicateIds = idAgg.size < stats.length;

  const totalDefeatCount = stats.reduce((sum, s) => sum + s.defeatCount, 0);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-text">方面別統計</h3>
      <table className="w-full text-xs">
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
              <td className="py-1 pr-2 text-text">{resolveName(s.direction)}</td>
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

      {/* 同ID方面の集約表示 */}
      {hasDuplicateIds && (
        <div className="mt-3 border-t border-border pt-2">
          <h4 className="mb-1 text-xs font-medium text-text-muted">方面名別合計</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="py-1 pr-2">方面</th>
                <th className="py-1 text-right">湧き</th>
                <th className="py-1 text-right">撃破</th>
              </tr>
            </thead>
            <tbody>
              {[...idAgg.entries()].map(([id, counts]) => (
                <tr key={id}>
                  <td className="py-1 pr-2 text-text">{resolveName(id)}</td>
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
