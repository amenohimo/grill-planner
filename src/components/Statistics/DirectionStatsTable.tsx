import type { DirectionStats } from '@/types';

interface DirectionStatsTableProps {
  stats: readonly DirectionStats[];
  totalGrillCount: number;
}

export function DirectionStatsTable({ stats, totalGrillCount }: DirectionStatsTableProps) {
  // 同名方面の集約
  const nameAgg = new Map<string, number>();
  for (const s of stats) {
    nameAgg.set(s.direction, (nameAgg.get(s.direction) ?? 0) + s.count);
  }
  const hasDuplicateNames = nameAgg.size < stats.length;

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-text">方面別統計</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-muted">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">方面</th>
            <th className="py-1 text-right">数</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} className="border-b border-border">
              <td className="py-1 pr-2 text-xs text-text-muted">{i + 1}</td>
              <td className="py-1 pr-2 text-text">{s.direction}</td>
              <td className="py-1 text-right font-medium text-text">{s.count}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-1 pr-2"></td>
            <td className="py-1 pr-2 text-text">合計</td>
            <td className="py-1 text-right text-text">{totalGrillCount}</td>
          </tr>
        </tbody>
      </table>

      {/* 同名方面の集約表示 */}
      {hasDuplicateNames && (
        <div className="mt-3 border-t border-border pt-2">
          <h4 className="mb-1 text-xs font-medium text-text-muted">方面名別合計</h4>
          <div className="space-y-0.5">
            {[...nameAgg.entries()].map(([name, count]) => (
              <div key={name} className="flex justify-between text-sm">
                <span className="text-text">{name}</span>
                <span className="font-medium text-text">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
