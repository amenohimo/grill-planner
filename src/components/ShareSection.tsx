import { useCallback, useMemo, useState } from "react";
import type { DefeatPoint } from "@/types/game";
import type { ScenarioData } from "@/types/scenario";
import {
  decodeAll,
  decodePartD,
  decodePartS,
  decodePartT,
  encodeAll,
  encodePartD,
  encodePartS,
  encodePartT,
} from "@/utils/magicWord";

interface ShareSectionProps {
  scenario: ScenarioData;
  onPasteTargetOrder: (order: string[]) => void;
  onPasteDefeats: (defeats: DefeatPoint[]) => void;
  onPasteScenario: (partial: Partial<ScenarioData>) => void;
  onPasteAll: (data: { targetOrder: string[]; defeats: DefeatPoint[]; scenario: Partial<ScenarioData> }) => void;
}

export function ShareSection({
  scenario,
  onPasteTargetOrder,
  onPasteDefeats,
  onPasteScenario,
  onPasteAll,
}: ShareSectionProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [toastError, setToastError] = useState<string | null>(null);

  const encodedT = useMemo(() => encodePartT(scenario.memo.targetOrder), [scenario]);
  const encodedD = useMemo(() => encodePartD(scenario.defeats), [scenario]);
  const encodedS = useMemo(() => encodePartS(scenario), [scenario]);
  const encodedAll = useMemo(() => encodeAll(scenario), [scenario]);

  const truncate = (code: string) => (code.length > 20 ? code.slice(0, 20) + "..." : code);

  const handleCopy = useCallback(async (label: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setFeedback((prev) => ({ ...prev, [label]: "コピーしました" }));
      setTimeout(() => {
        setFeedback((prev) => {
          const next = { ...prev };
          delete next[label];
          return next;
        });
      }, 2000);
    } catch {
      setFeedback((prev) => ({ ...prev, [label]: "コピー失敗" }));
    }
  }, []);

  const handlePaste = useCallback(
    async (label: string, decodeFn: (code: string) => unknown, dispatchFn: (data: unknown) => void) => {
      try {
        const code = await navigator.clipboard.readText();
        const data = decodeFn(code);
        dispatchFn(data);
        setFeedback((prev) => ({ ...prev, [label]: "貼り付け成功" }));
        setTimeout(() => {
          setFeedback((prev) => {
            const next = { ...prev };
            delete next[label];
            return next;
          });
        }, 2000);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "貼り付け失敗";
        setFeedback((prev) => ({ ...prev, [label]: msg }));
        setToastError(msg);
        setTimeout(() => setToastError(null), 3000);
      }
    },
    [],
  );

  const rows = useMemo(
    () => [
      {
        label: "撃破点",
        code: encodedD,
        decodeFn: decodePartD,
        dispatchFn: onPasteDefeats,
      },
      {
        label: "詳細",
        code: encodedS,
        decodeFn: decodePartS,
        dispatchFn: onPasteScenario,
      },
      {
        label: "ターゲット順",
        code: encodedT,
        decodeFn: decodePartT,
        dispatchFn: onPasteTargetOrder,
      },
      {
        label: "すべて",
        code: encodedAll,
        decodeFn: (code: string) => {
          const d = decodeAll(code);
          return { targetOrder: d.t, defeats: d.d, scenario: d.s };
        },
        dispatchFn: onPasteAll,
      },
    ],
    [encodedD, encodedS, encodedT, encodedAll, onPasteDefeats, onPasteScenario, onPasteTargetOrder, onPasteAll],
  );

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-1 text-sm font-medium text-text hover:bg-bg"
      >
        <span className="text-xs text-text-muted">{open ? "▼" : "▶"}</span>
        共有
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          {rows.map(({ label, code, decodeFn, dispatchFn }) => (
            <div key={label}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-28 shrink-0">{label}</span>
                <input
                  type="text"
                  readOnly
                  value={truncate(code)}
                  className={`flex-1 rounded-sm border px-2 py-1 text-sm text-text font-mono bg-surface ${
                    feedback[label]?.includes("失敗") ? "border-danger" : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(label, code)}
                  className="rounded-sm bg-primary px-2 py-1 text-xs text-white hover:opacity-80 whitespace-nowrap"
                >
                  コピー
                </button>
                <button
                  type="button"
                  onClick={() => handlePaste(label, decodeFn, dispatchFn as (data: unknown) => void)}
                  className="rounded-sm bg-primary px-2 py-1 text-xs text-white hover:opacity-80 whitespace-nowrap"
                >
                  貼付
                </button>
              </div>
              {feedback[label] && <span className="text-xs text-text-muted">{feedback[label]}</span>}
            </div>
          ))}
        </div>
      )}
      {toastError && (
        <div className="fixed bottom-4 right-4 bg-danger text-white px-4 py-2 rounded-sm text-sm shadow-lg z-50">
          {toastError}
        </div>
      )}
    </div>
  );
}
