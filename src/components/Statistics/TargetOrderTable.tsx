import { useMemo } from "react";
import { ButtonGroup } from "@/components/ButtonGroup";
import { getWeaponIconPath, PLAYER_IDS } from "@/constants";
import type { WeaponMaster } from "@/types";

interface TargetOrderTableProps {
  order: readonly string[];
  weapons: readonly string[];
  weaponMaster: readonly WeaponMaster[];
  onSetEntry: (index: number, value: string) => void;
  onShift: (direction: "up" | "down") => void;
}

const ROWS = 25;

export function TargetOrderTable({ order, weapons, weaponMaster, onSetEntry, onShift }: TargetOrderTableProps) {
  const options = useMemo(() => {
    const weaponIconMap = new Map<string, string | null>();
    for (const pid of PLAYER_IDS) {
      const idx = Number(pid[0]) - 1;
      const rowId = weapons[idx];
      if (rowId) {
        const master = weaponMaster.find((w) => w.rowId === rowId);
        weaponIconMap.set(pid, master ? getWeaponIconPath(master.id) : null);
      } else {
        weaponIconMap.set(pid, null);
      }
    }

    return [
      ...PLAYER_IDS.map((pid) => ({
        value: pid,
        label: pid,
        icon: weaponIconMap.get(pid) ?? null,
      })),
      { value: "-" as string, label: "-" },
    ];
  }, [weapons, weaponMaster]);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-text">ターゲット順</h3>
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          className="rounded-sm border border-border bg-surface px-2 py-0.5 text-xs text-text hover:bg-bg"
          onClick={() => onShift("down")}
        >
          ▽1つ下にずらす
        </button>
        <button
          type="button"
          className="rounded-sm border border-border bg-surface px-2 py-0.5 text-xs text-text hover:bg-bg"
          onClick={() => onShift("up")}
        >
          △1つ上にずらす
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-6 text-right text-xs text-text-muted">{i + 1}</span>
            <ButtonGroup options={options} selected={order[i] ?? "-"} onChange={(v) => onSetEntry(i, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
