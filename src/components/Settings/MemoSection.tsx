import { useState, useCallback, useEffect, useRef } from "react";
import type { ScenarioMemo, WeaponMaster, SpecialMaster } from "@/types";
import { getWeaponIconPath, getSpecialIconPath, PLAYER_IDS } from "@/constants";

// ============================================================
// シナリオコード正規化・バリデーション
// ============================================================

const VALID_CHARS = new Set("ABCDEFGHJKLMNPQRSTUVWXY0123456789".split(""));

function normalizeScenarioCode(raw: string): string {
  // 1. 全角→半角
  let s = raw.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  // 2. 小文字→大文字
  s = s.toUpperCase();
  // 3. 有効文字とハイフン以外を除去
  s = s.replace(/[^ABCDEFGHJKLMNPQRSTUVWXY0123456789-]/g, "");
  // 4. ハイフンを全除去（再挿入するため）
  s = s.replace(/-/g, "");
  // 5. 最大16文字
  s = s.slice(0, 17);
  // 6. ハイフン自動挿入: Sxxx-xxxx-xxxx-xxxx
  s = (s.match(/.{1,4}/g) ?? []).join("-");
  return s;
}

function validateScenarioCode(normalized: string): boolean {
  if (normalized === "") return true;
  const bare = normalized.replace(/-/g, "");
  if (bare.length !== 16) return false;
  if (bare[0] !== "S") return false;
  return [...bare].every((ch) => VALID_CHARS.has(ch));
}

interface MemoSectionProps {
  memo: ScenarioMemo;
  weapons: readonly WeaponMaster[];
  specials: readonly SpecialMaster[];
  onSetScenarioCode: (code: string) => void;
  onSetWeapon: (index: number, rowId: string) => void;
  onSetSpecial: (index: number, rowId: string) => void;
  onSetSnatchers: (value: string) => void;
  onSetFreeNote: (value: string) => void;
}

export function MemoSection({
  memo,
  weapons,
  specials,
  onSetScenarioCode,
  onSetWeapon,
  onSetSpecial,
  onSetSnatchers,
  onSetFreeNote,
}: MemoSectionProps) {
  const [open, setOpen] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const cursorBefore = el.selectionStart ?? 0;
      const rawBefore = el.value;

      const normalized = normalizeScenarioCode(el.value);
      onSetScenarioCode(normalized);
      setCodeError(!validateScenarioCode(normalized));

      // カーソル位置補正
      const barePosBefore = rawBefore.slice(0, cursorBefore).replace(/-/g, "").length;
      let bareCount = 0;
      let newCursor = 0;
      for (let i = 0; i < normalized.length; i++) {
        if (normalized[i] !== "-") bareCount++;
        if (bareCount >= barePosBefore) {
          newCursor = i + 1;
          break;
        }
      }
      if (bareCount < barePosBefore) newCursor = normalized.length;

      requestAnimationFrame(() => {
        el.setSelectionRange(newCursor, newCursor);
      });
    },
    [onSetScenarioCode],
  );

  const handleFreeNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onSetFreeNote(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    [onSetFreeNote],
  );

  useEffect(() => {
    if (textareaRef.current && memo.freeNote) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [memo.freeNote]);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-text hover:bg-bg"
      >
        <span className="text-xs text-text-muted">{open ? "▼" : "▶"}</span>
        メモ
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {/* シナリオコード */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">シナリオコード</label>
            <input
              ref={codeInputRef}
              type="text"
              value={memo.scenarioCode}
              onChange={handleCodeChange}
              placeholder="Sxxx-xxxx-xxxx-xxxx"
              maxLength={20}
              className={`w-52 rounded-sm border px-2 py-1 text-sm text-text ${
                codeError ? "border-danger" : "border-border"
              } bg-surface`}
            />
          </div>

          {/* ブキ/スペシャル選択（表レイアウト） */}
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th />
                {PLAYER_IDS.map((pid) => (
                  <th key={pid} className="px-1 pb-1 text-center font-medium text-text-muted">
                    {pid}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-2 text-text-muted">ブキ</td>
                {PLAYER_IDS.map((_, i) => {
                  const selectedRowId = memo.weapons[i] ?? "";
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
                            <option key={w.rowId} value={w.rowId}>
                              {w.label}
                            </option>
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
                  const selectedRowId = memo.specials[i] ?? "";
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
                            <option key={s.rowId} value={s.rowId}>
                              {s.label}
                            </option>
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

          {/* 自由メモ */}
          <div>
            <label className="mb-1 block text-xs text-text-muted">自由メモ</label>
            <textarea
              ref={textareaRef}
              value={memo.freeNote}
              onChange={handleFreeNoteChange}
              placeholder="自由にメモを記入できます"
              className="w-full rounded-sm border border-border bg-surface px-2 py-1 text-sm text-text"
              style={{ minHeight: "3rem", resize: "none", overflow: "hidden" }}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>
      )}
    </div>
  );
}
