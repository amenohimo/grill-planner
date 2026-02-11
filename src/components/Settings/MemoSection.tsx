import { useState } from 'react';
import type { ScenarioMemo, WeaponMaster, SpecialMaster, DisplayMode, TargetMode } from '@/types';
import { getWeaponIconPath, getSpecialIconPath, PLAYER_IDS } from '@/constants';

interface MemoSectionProps {
  memo: ScenarioMemo;
  weapons: readonly WeaponMaster[];
  specials: readonly SpecialMaster[];
  displayMode: DisplayMode;
  onSetScenarioCode: (code: string) => void;
  onSetWeapon: (index: number, weaponId: number) => void;
  onSetSpecial: (index: number, specialId: number) => void;
  onSetTargetMode: (mode: TargetMode) => void;
  onSetSnatchers: (value: string) => void;
}

export function MemoSection({
  memo,
  weapons,
  specials,
  displayMode,
  onSetScenarioCode,
  onSetWeapon,
  onSetSpecial,
  onSetTargetMode,
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

          {/* ブキ選択 */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">ブキ</label>
            <div className="flex flex-wrap gap-2">
              {PLAYER_IDS.map((pid, i) => {
                const selectedId = memo.weapons[i] ?? 0;
                return (
                  <div key={pid} className="flex items-center gap-1">
                    <span className="text-xs text-text-muted">{pid}</span>
                    {displayMode !== 'text' && selectedId > 0 && (
                      <img
                        src={getWeaponIconPath(selectedId)}
                        alt=""
                        className="h-6 w-6"
                      />
                    )}
                    <select
                      value={selectedId}
                      onChange={(e) => onSetWeapon(i, Number(e.target.value))}
                      className="w-32 rounded-sm border border-border bg-surface px-1 py-0.5 text-xs text-text"
                    >
                      <option value={0}>--</option>
                      {weapons.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* スペシャル選択 */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">スペシャル</label>
            <div className="flex flex-wrap gap-2">
              {PLAYER_IDS.map((pid, i) => {
                const selectedId = memo.specials[i] ?? 0;
                return (
                  <div key={pid} className="flex items-center gap-1">
                    <span className="text-xs text-text-muted">{pid}</span>
                    {displayMode !== 'text' && selectedId > 0 && (
                      <img
                        src={getSpecialIconPath(selectedId)}
                        alt=""
                        className="h-6 w-6"
                      />
                    )}
                    <select
                      value={selectedId}
                      onChange={(e) => onSetSpecial(i, Number(e.target.value))}
                      className="w-32 rounded-sm border border-border bg-surface px-1 py-0.5 text-xs text-text"
                    >
                      <option value={0}>--</option>
                      {specials.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ターゲットモード */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">ターゲット基準</label>
            <div className="flex gap-2">
              <button
                onClick={() => onSetTargetMode('weapon')}
                className={`rounded-sm px-2 py-0.5 text-xs ${
                  memo.targetOrder.mode === 'weapon'
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface text-text'
                }`}
              >
                ブキ順
              </button>
              <button
                onClick={() => onSetTargetMode('player')}
                className={`rounded-sm px-2 py-0.5 text-xs ${
                  memo.targetOrder.mode === 'player'
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface text-text'
                }`}
              >
                プレイヤー順
              </button>
            </div>
          </div>

          {/* サッチャーメモ */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">ハコビヤメモ</label>
            <input
              type="text"
              value={memo.snatchers}
              onChange={(e) => onSetSnatchers(e.target.value)}
              placeholder="自由メモ"
              className="w-full rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text"
            />
          </div>
        </div>
      )}
    </div>
  );
}
