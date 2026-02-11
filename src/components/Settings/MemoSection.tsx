import { useState } from 'react';
import type { ScenarioMemo, WeaponMaster, SpecialMaster } from '@/types';
import { getWeaponIconPath, getSpecialIconPath, PLAYER_IDS } from '@/constants';

interface MemoSectionProps {
  memo: ScenarioMemo;
  weapons: readonly WeaponMaster[];
  specials: readonly SpecialMaster[];
  onSetScenarioCode: (code: string) => void;
  onSetWeapon: (index: number, rowId: string) => void;
  onSetSpecial: (index: number, rowId: string) => void;
  onSetSnatchers: (value: string) => void;
}

export function MemoSection({
  memo,
  weapons,
  specials,
  onSetScenarioCode,
  onSetWeapon,
  onSetSpecial,
  onSetSnatchers,
}: MemoSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-text hover:bg-bg"
      >
        <span className="text-xs text-text-muted">{open ? '▼' : '▶'}</span>
        メモ
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {/* シナリオコード */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">シナリオコード</label>
            <input
              type="text"
              value={memo.scenarioCode}
              onChange={(e) => onSetScenarioCode(e.target.value)}
              placeholder="例: RM-01-A"
              className="w-48 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text"
            />
          </div>

          {/* ブキ/スペシャル選択（表レイアウト） */}
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th />
                {PLAYER_IDS.map((pid) => (
                  <th key={pid} className="px-1 pb-1 text-center font-medium text-text-muted">{pid}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-2 text-text-muted">ブキ</td>
                {PLAYER_IDS.map((_, i) => {
                  const selectedRowId = memo.weapons[i] ?? '';
                  const selectedWeapon = weapons.find((w) => w.rowId === selectedRowId);
                  return (
                    <td key={i} className="px-1 py-0.5">
                      <div className="flex items-center gap-1">
                        <div className="h-6 w-6 shrink-0">
                          {selectedWeapon && (
                            <img src={getWeaponIconPath(selectedWeapon.id)} alt="" className="h-6 w-6" />
                          )}
                        </div>
                        <select
                          value={selectedRowId}
                          onChange={(e) => onSetWeapon(i, e.target.value)}
                          className="w-40 rounded-sm border border-border bg-surface px-1 py-0.5 text-xs text-text"
                        >
                          <option value="">--</option>
                          {weapons.map((w) => (
                            <option key={w.rowId} value={w.rowId}>{w.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="pr-2 text-text-muted">SP</td>
                {PLAYER_IDS.map((_, i) => {
                  const selectedRowId = memo.specials[i] ?? '';
                  const selectedSpecial = specials.find((s) => s.rowId === selectedRowId);
                  return (
                    <td key={i} className="px-1 py-0.5">
                      <div className="flex items-center gap-1">
                        <div className="h-6 w-6 shrink-0">
                          {selectedSpecial && (
                            <img src={getSpecialIconPath(selectedSpecial.id)} alt="" className="h-6 w-6" />
                          )}
                        </div>
                        <select
                          value={selectedRowId}
                          onChange={(e) => onSetSpecial(i, e.target.value)}
                          className="w-40 rounded-sm border border-border bg-surface px-1 py-0.5 text-xs text-text"
                        >
                          <option value="">--</option>
                          {specials.map((s) => (
                            <option key={s.rowId} value={s.rowId}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          {/* サッチャーメモ */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">タマヒロイ方向</label>
            <input
              type="text"
              value={memo.snatchers}
              onChange={(e) => onSetSnatchers(e.target.value)}
              placeholder="右ヒロイ"
              className="w-48 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text"
            />
          </div>
        </div>
      )}
    </div>
  );
}
