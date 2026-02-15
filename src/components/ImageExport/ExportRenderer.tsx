import { Fragment } from "react";
import { GAME_DURATION_SECONDS, getSpecialIconPath, getWeaponIconPath } from "@/constants";
import type {
  DefeatPoint,
  DirectionId,
  DirectionSetting,
  DirectionStats,
  DisplayMode,
  InterpolatedHazardConfig,
  ScenarioMemo,
  SpawnPoint,
  SpecialMaster,
  WeaponMaster,
} from "@/types";
import { calculateSpawnerDecisionTime, framesToSeconds } from "@/utils/calculations";
import {
  ACTIVITY_BAR_WIDTH,
  DIRECTION_LABEL_WIDTH,
  frameToPixelY,
  getDirectionColor,
  LANE_SPACING,
  LANE_WIDTH,
  MARKER_CENTER_RATIO,
  MARKER_SIZE,
  PIXELS_PER_SECOND,
  TIME_AXIS_WIDTH,
  TIMELINE_HEIGHT,
} from "../Timeline/coordinates";

export interface ExportRendererProps {
  hazardLevel: number;
  spawns: readonly SpawnPoint[];
  defeats: readonly DefeatPoint[];
  directions: readonly DirectionSetting[];
  hazardConfig: InterpolatedHazardConfig;
  directionPresets: readonly [string, string, string];
  directionStats: readonly DirectionStats[];
  totalGrillCount: number;
  memo: ScenarioMemo;
  weapons: readonly WeaponMaster[];
  specials: readonly SpecialMaster[];
  targetOrder: readonly string[];
  weaponRowIds: readonly string[];
  displayMode: DisplayMode;
  colorThemeColors: [string, string, string];
}

const CONTAINER_WIDTH = 1200;
const RIGHT_PANEL_WIDTH = 360;
const TIMELINE_AREA_WIDTH = CONTAINER_WIDTH - RIGHT_PANEL_WIDTH;

export function ExportRenderer({
  hazardLevel,
  spawns,
  defeats,
  directions,
  hazardConfig,
  directionPresets,
  directionStats,
  totalGrillCount,
  memo,
  weapons,
  specials,
  targetOrder,
  weaponRowIds,
  displayMode,
  colorThemeColors,
}: ExportRendererProps) {
  const showBSlot = hazardConfig.bSlotOpenFrame >= 0;

  const allSpawns = [...spawns].filter((s) => s.frameTime > 0).sort((a, b) => b.frameTime - a.frameTime);
  const aSpawns = allSpawns.filter((s) => s.slot === "A");
  const bSpawns = allSpawns.filter((s) => s.slot === "B");
  const aDefeats = [...defeats].filter((d) => d.slot === "A").sort((a, b) => b.frameTime - a.frameTime);
  const bDefeats = [...defeats].filter((d) => d.slot === "B").sort((a, b) => b.frameTime - a.frameTime);

  // Spawn display info (direction index)
  let prevDirection: number | null = null;
  let directionCounter = 0;
  const spawnDisplayMap = new Map<
    string,
    { directionName: string; directionIndex: number; targetLabel: string | null; targetIcon: string | null }
  >();
  for (let i = 0; i < allSpawns.length; i++) {
    const spawn = allSpawns[i]!;
    const directionName = directionPresets[spawn.direction] ?? `方面${spawn.direction + 1}`;
    if (spawn.direction !== prevDirection) {
      directionCounter = 1;
      prevDirection = spawn.direction;
    } else {
      directionCounter++;
    }

    let targetLabel: string | null = null;
    let targetIcon: string | null = null;
    const targetEntry = targetOrder[i];
    if (targetEntry && targetEntry !== "-") {
      targetLabel = targetEntry;
      const playerIndex = Number.parseInt(targetEntry[0]!, 10) - 1;
      const weaponRowId = weaponRowIds[playerIndex];
      if (weaponRowId) {
        const weapon = weapons.find((w) => w.rowId === weaponRowId);
        targetIcon = weapon ? getWeaponIconPath(weapon.id) : null;
      }
    }
    spawnDisplayMap.set(spawn.id, { directionName, directionIndex: directionCounter, targetLabel, targetIcon });
  }

  // Spawn-defeat pairing per slot
  const pairSpawnDefeats = (slotSpawns: SpawnPoint[], slotDefeats: DefeatPoint[]) =>
    slotSpawns.map((spawn, i) => ({ spawn, defeat: slotDefeats[i] ?? null }));

  const aPairs = pairSpawnDefeats(aSpawns, aDefeats);
  const bPairs = pairSpawnDefeats(bSpawns, bDefeats);

  // Respawn spawns (spawns caused by defeats)
  const respawnSpawns = (slotSpawns: SpawnPoint[]) => slotSpawns.filter((s) => !s.isAuto && s.defeatId);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <div
      style={{
        width: CONTAINER_WIDTH,
        fontFamily: "sans-serif",
        backgroundColor: "#ffffff",
        color: "#1e293b",
        // CSS custom properties for direction colors
        ["--color-dir-0" as string]: colorThemeColors[0],
        ["--color-dir-1" as string]: colorThemeColors[1],
        ["--color-dir-2" as string]: colorThemeColors[2],
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "2px solid #e2e8f0",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: "bold" }}>Grill Planner</span>
      </div>

      {/* Main body */}
      <div style={{ display: "flex" }}>
        {/* Timeline area */}
        <div style={{ width: TIMELINE_AREA_WIDTH, padding: "8px 8px 8px 4px" }}>
          <div style={{ display: "flex" }}>
            {/* Direction labels */}
            <ExportDirectionLabels directions={directions} presetNames={directionPresets} />

            {/* Time axis */}
            <ExportTimeAxis />

            {/* Lanes */}
            <div style={{ display: "flex", gap: LANE_SPACING }}>
              {/* A slot */}
              <ExportLane
                slot="A"
                slotSpawns={aSpawns}
                slotDefeats={aDefeats}
                allDefeats={defeats}
                pairs={aPairs}
                respawnSpawns={respawnSpawns(aSpawns)}
                spawnDisplayMap={spawnDisplayMap}
                displayMode={displayMode}
              />

              {/* B slot */}
              {showBSlot && (
                <ExportLane
                  slot="B"
                  slotSpawns={bSpawns}
                  slotDefeats={bDefeats}
                  allDefeats={defeats}
                  pairs={bPairs}
                  respawnSpawns={respawnSpawns(bSpawns)}
                  spawnDisplayMap={spawnDisplayMap}
                  displayMode={displayMode}
                  inactiveAboveFrame={hazardConfig.bSlotOpenFrame}
                  showLegend
                />
              )}
            </div>

            {/* Legend for no-B-slot case */}
            {!showBSlot && (
              <div style={{ marginLeft: 12 }}>
                <ExportLegend />
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div
          style={{
            width: RIGHT_PANEL_WIDTH,
            borderLeft: "1px solid #e2e8f0",
            padding: "12px 16px",
            fontSize: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>キケン度: {hazardLevel}%</div>

          <ExportDetails memo={memo} weapons={weapons} specials={specials} weaponRowIds={weaponRowIds} />

          <ExportStats stats={directionStats} totalGrillCount={totalGrillCount} presetNames={directionPresets} />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          padding: "8px 16px",
          fontSize: 11,
          color: "#64748b",
          textAlign: "center",
        }}
      >
        {dateStr} 生成
      </div>
    </div>
  );
}

// ============================================================
// Direction Labels (static)
// ============================================================

function ExportDirectionLabels({
  directions,
  presetNames,
}: {
  directions: readonly DirectionSetting[];
  presetNames: readonly [string, string, string];
}) {
  const sortedDirs = [...directions].sort((a, b) => b.frameTime - a.frameTime);
  return (
    <div style={{ position: "relative", width: DIRECTION_LABEL_WIDTH, height: TIMELINE_HEIGHT }}>
      {sortedDirs.map((dir, index) => {
        const top = frameToPixelY(dir.frameTime);
        const nextDir = sortedDirs[index + 1];
        const bottom = nextDir ? frameToPixelY(nextDir.frameTime) : TIMELINE_HEIGHT;
        const height = bottom - top;
        const color = getDirectionColor(dir.direction);
        const displayName = presetNames[dir.direction] ?? `方面${dir.direction + 1}`;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              top,
              height,
              width: DIRECTION_LABEL_WIDTH,
              backgroundColor: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {displayName}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Time Axis (static)
// ============================================================

function ExportTimeAxis() {
  const ticks: { second: number; pixelY: number; type: "major" | "minor" | "micro" }[] = [];
  for (let s = 0; s <= GAME_DURATION_SECONDS; s++) {
    const pixelY = (GAME_DURATION_SECONDS - s) * PIXELS_PER_SECOND;
    let type: "major" | "minor" | "micro" = "micro";
    if (s % 10 === 0) type = "major";
    else if (s % 5 === 0) type = "minor";
    ticks.push({ second: s, pixelY, type });
  }

  return (
    <div
      style={{
        position: "relative",
        width: TIME_AXIS_WIDTH,
        height: TIMELINE_HEIGHT,
        borderRight: "1px solid #e2e8f0",
      }}
    >
      {ticks.map((tick) => (
        <div
          key={tick.second}
          style={{
            position: "absolute",
            right: 0,
            top: tick.pixelY,
            height: 1,
            width: tick.type === "major" ? TIME_AXIS_WIDTH : tick.type === "minor" ? 12 : 4,
            backgroundColor: tick.type === "major" ? "#94a3b8" : tick.type === "minor" ? "#cbd5e1" : "#e2e8f0",
          }}
        />
      ))}
      {ticks
        .filter((t) => t.type === "major")
        .map((tick) => (
          <div
            key={`label-${tick.second}`}
            style={{
              position: "absolute",
              right: 4,
              top: tick.pixelY,
              transform: "translateY(-50%)",
              fontSize: 11,
              color: "#64748b",
              whiteSpace: "nowrap",
            }}
          >
            {tick.second}s
          </div>
        ))}
    </div>
  );
}

// ============================================================
// Lane (static)
// ============================================================

interface ExportLaneProps {
  slot: "A" | "B";
  slotSpawns: SpawnPoint[];
  slotDefeats: DefeatPoint[];
  allDefeats: readonly DefeatPoint[];
  pairs: { spawn: SpawnPoint; defeat: DefeatPoint | null }[];
  respawnSpawns: SpawnPoint[];
  spawnDisplayMap: Map<
    string,
    { directionName: string; directionIndex: number; targetLabel: string | null; targetIcon: string | null }
  >;
  displayMode: DisplayMode;
  inactiveAboveFrame?: number;
  showLegend?: boolean;
}

function ExportLane({
  slot,
  slotSpawns,
  slotDefeats,
  allDefeats,
  pairs,
  respawnSpawns,
  spawnDisplayMap,
  displayMode,
  inactiveAboveFrame,
  showLegend,
}: ExportLaneProps) {
  const slotColor = slot === "A" ? "#ef4444" : "#3b82f6";
  return (
    <div
      style={{
        position: "relative",
        width: LANE_WIDTH,
        height: TIMELINE_HEIGHT,
        borderTop: `3px solid ${slotColor}`,
        overflow: "visible",
      }}
    >
      {/* Active periods */}
      {pairs
        .filter(({ spawn }) => spawn.frameTime > 0)
        .map(({ spawn, defeat }) => {
          const topY = frameToPixelY(spawn.frameTime);
          const bottomY = defeat ? frameToPixelY(defeat.frameTime) : frameToPixelY(0);
          const height = bottomY - topY;
          if (height <= 0) return null;
          const bgColor = slot === "A" ? "var(--color-slot-a-light)" : "var(--color-slot-b-light)";
          return (
            <div
              key={`active-${spawn.id}`}
              style={{
                position: "absolute",
                top: topY,
                left: `${MARKER_CENTER_RATIO * 100}%`,
                transform: "translateX(-50%)",
                height,
                width: ACTIVITY_BAR_WIDTH,
                backgroundColor: bgColor,
                borderRadius: 2,
                zIndex: 1,
              }}
            />
          );
        })}

      {/* Respawn connectors */}
      {respawnSpawns
        .filter((spawn) => spawn.frameTime > 0)
        .map((spawn) => {
          const defeat = allDefeats.find((d) => d.id === spawn.defeatId);
          if (!defeat) return null;
          const decisionFrame = calculateSpawnerDecisionTime(defeat.frameTime);
          const defeatY = frameToPixelY(defeat.frameTime);
          const decisionY = frameToPixelY(decisionFrame);
          const spawnY = frameToPixelY(spawn.frameTime);
          const x = LANE_WIDTH * MARKER_CENTER_RATIO;
          return (
            <svg
              key={`connector-${spawn.id}`}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                zIndex: 2,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              <line x1={x} y1={defeatY} x2={x} y2={decisionY} stroke="#a3a3a3" strokeWidth={1} />
              <circle cx={x} cy={decisionY} r={MARKER_SIZE * 0.25} fill="#facc15" stroke="#a3a3a3" strokeWidth={0.5} />
              <line x1={x} y1={decisionY} x2={x} y2={spawnY} stroke="#a3a3a3" strokeWidth={1} strokeDasharray="4 3" />
            </svg>
          );
        })}

      {/* Spawn markers */}
      {slotSpawns
        .filter((s) => s.frameTime > 0)
        .map((spawn) => {
          const info = spawnDisplayMap.get(spawn.id);
          const isSuppressed = spawn.isSuppressed === true;
          const seconds = framesToSeconds(spawn.frameTime);
          const pixelY = frameToPixelY(spawn.frameTime);
          const dirName = info?.directionName ?? String(spawn.direction);
          const dirIndex = info?.directionIndex ?? "?";
          return (
            <div
              key={spawn.id}
              style={{
                position: "absolute",
                top: pixelY,
                left: `${MARKER_CENTER_RATIO * 100}%`,
                transform: `translateX(-${MARKER_SIZE / 2}px) translateY(-50%)`,
                zIndex: 3,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: MARKER_SIZE,
                  height: MARKER_SIZE,
                  borderRadius: "50%",
                  border: "1px solid #e2e8f0",
                  flexShrink: 0,
                  ...(isSuppressed
                    ? {
                        background: `repeating-linear-gradient(-45deg, #22c55e, #22c55e 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 4px)`,
                      }
                    : { backgroundColor: "#22c55e" }),
                }}
              />
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 14,
                  color: "#64748b",
                  backgroundColor: "rgba(255,255,255,0.85)",
                  padding: "1px 4px",
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                  lineHeight: 1.3,
                }}
              >
                {seconds}s {dirName}({dirIndex})
                {info?.targetLabel && displayMode !== "icon" ? ` ${info.targetLabel}` : ""}
              </span>
              {info?.targetIcon && displayMode !== "text" && (
                <div
                  style={{
                    marginLeft: 3,
                    padding: 2,
                    backgroundColor: "rgba(255,255,255,0.85)",
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                    lineHeight: 0,
                  }}
                >
                  <img src={info.targetIcon} alt="" style={{ width: 28, height: 28, display: "block" }} />
                </div>
              )}
            </div>
          );
        })}

      {/* Elapsed time labels */}
      {pairs.map(({ spawn, defeat }) => {
        if (spawn.frameTime <= 0 || !defeat) return null;
        const spawnY = frameToPixelY(spawn.frameTime);
        const defeatY = frameToPixelY(defeat.frameTime);
        const midY = (spawnY + defeatY) / 2;
        const spawnSec = framesToSeconds(spawn.frameTime);
        const defeatSec = framesToSeconds(defeat.frameTime);
        const elapsed = Math.round((spawnSec - defeatSec) * 10) / 10;
        return (
          <div
            key={`elapsed-${spawn.id}`}
            style={{
              position: "absolute",
              top: midY,
              right: `${(1 - MARKER_CENTER_RATIO) * 100}%`,
              transform: "translateY(-50%)",
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <span
              style={{
                marginRight: 4,
                fontSize: 14,
                color: "#64748b",
                backgroundColor: "rgba(255,255,255,0.85)",
                padding: "1px 4px",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                whiteSpace: "nowrap",
              }}
            >
              {elapsed}s
            </span>
          </div>
        );
      })}

      {/* Defeat markers */}
      {slotDefeats.map((defeat) => {
        const pixelY = frameToPixelY(defeat.frameTime);
        const seconds = framesToSeconds(defeat.frameTime);
        return (
          <div
            key={defeat.id}
            style={{
              position: "absolute",
              top: pixelY,
              left: `${MARKER_CENTER_RATIO * 100}%`,
              transform: `translateX(-${MARKER_SIZE / 2}px) translateY(-50%)`,
              zIndex: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: MARKER_SIZE,
                height: MARKER_SIZE,
                backgroundColor: "#f97316",
                border: "1px solid #e2e8f0",
                borderRadius: 3,
                transform: "rotate(45deg)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                marginLeft: 4,
                fontSize: 14,
                color: "#64748b",
                backgroundColor: "rgba(255,255,255,0.85)",
                padding: "1px 4px",
                borderRadius: 2,
                whiteSpace: "nowrap",
              }}
            >
              {seconds}s
            </span>
          </div>
        );
      })}

      {/* Inactive area (B slot) */}
      {inactiveAboveFrame != null && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: frameToPixelY(inactiveAboveFrame),
            backgroundColor: "rgba(128, 128, 128, 0.3)",
            zIndex: 5,
          }}
        >
          {showLegend && (
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                right: 8,
              }}
            >
              <ExportLegend />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Legend
// ============================================================

function ExportLegend() {
  return (
    <div
      style={{
        fontSize: 11,
        lineHeight: 1.8,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        padding: "4px 8px",
        borderRadius: 4,
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>凡例</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#22c55e",
            border: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        />
        <span>湧き</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: "#f97316",
            transform: "rotate(45deg)",
            flexShrink: 0,
          }}
        />
        <span>撃破</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 10,
            height: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#facc15",
              border: "1px solid #a3a3a3",
            }}
          />
        </div>
        <span>スポナー確定</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            border: "1px solid #e2e8f0",
            background:
              "repeating-linear-gradient(-45deg, #22c55e, #22c55e 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 4px)",
            flexShrink: 0,
          }}
        />
        <span>湧き（抑制）</span>
      </div>
    </div>
  );
}

// ============================================================
// Details panel
// ============================================================

function ExportDetails({
  memo,
  weapons,
  specials,
  weaponRowIds,
}: {
  memo: ScenarioMemo;
  weapons: readonly WeaponMaster[];
  specials: readonly SpecialMaster[];
  weaponRowIds: readonly string[];
}) {
  const hasCode = memo.scenarioCode.length > 0;
  const hasAnyWeaponOrSpecial = weaponRowIds.some((id) => id !== "") || memo.specials.some((id) => id !== "");
  const hasSnatchers = memo.snatchers.length > 0;
  const hasFreeNote = memo.freeNote.length > 0;
  const hasAny = hasCode || hasAnyWeaponOrSpecial || hasSnatchers || hasFreeNote;

  if (!hasAny) return null;

  const resolveWeaponLabel = (rowId: string) => weapons.find((w) => w.rowId === rowId)?.label ?? "-";
  const resolveSpecialLabel = (rowId: string) => specials.find((s) => s.rowId === rowId)?.label ?? "-";
  const resolveWeaponIcon = (rowId: string) => {
    const w = weapons.find((w) => w.rowId === rowId);
    return w ? getWeaponIconPath(w.id) : null;
  };
  const resolveSpecialIcon = (rowId: string) => {
    const s = specials.find((s) => s.rowId === rowId);
    return s ? getSpecialIconPath(s.id) : null;
  };

  const PLAYER_IDS = ["1P", "2P", "3P", "4P"] as const;
  const cellBorder = "1px solid #e2e8f0";

  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>詳細</h3>

      {hasCode && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "#64748b" }}>コード: </span>
          {memo.scenarioCode}
        </div>
      )}

      {hasAnyWeaponOrSpecial && (
        <table style={{ fontSize: 12, borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
          <tbody>
            {PLAYER_IDS.map((pid, i) => {
              const weaponRowId = weaponRowIds[i] ?? "";
              const weaponLabel = weaponRowId ? resolveWeaponLabel(weaponRowId) : "-";
              const weaponIcon = weaponRowId ? resolveWeaponIcon(weaponRowId) : null;
              const specialRowId = memo.specials[i] ?? "";
              const specialLabel = specialRowId ? resolveSpecialLabel(specialRowId) : "-";
              const specialIcon = specialRowId ? resolveSpecialIcon(specialRowId) : null;
              return (
                <Fragment key={pid}>
                  <tr>
                    <td
                      rowSpan={2}
                      style={{
                        padding: "2px 6px",
                        borderBottom: cellBorder,
                        verticalAlign: "top",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pid}
                    </td>
                    <td style={{ padding: "2px 4px", color: "#64748b", whiteSpace: "nowrap" }}>ブキ</td>
                    <td style={{ padding: "2px 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {weaponIcon && <img src={weaponIcon} alt="" style={{ width: 20, height: 20 }} />}
                        {weaponLabel}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{ padding: "2px 4px", borderBottom: cellBorder, color: "#64748b", whiteSpace: "nowrap" }}
                    >
                      SP
                    </td>
                    <td style={{ padding: "2px 4px", borderBottom: cellBorder }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {specialIcon && <img src={specialIcon} alt="" style={{ width: 20, height: 20 }} />}
                        {specialLabel}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {hasSnatchers && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>タマヒロイ方向: </span>
          {memo.snatchers}
        </div>
      )}

      {hasFreeNote && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>メモ: </span>
          {memo.freeNote}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Stats panel
// ============================================================

function ExportStats({
  stats,
  totalGrillCount,
  presetNames,
}: {
  stats: readonly DirectionStats[];
  totalGrillCount: number;
  presetNames: readonly [string, string, string];
}) {
  const resolveName = (id: DirectionId) => presetNames[id] ?? `方面${id + 1}`;

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

  const cellStyle = { padding: "3px 6px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" as const };
  const rightCell = { ...cellStyle, textAlign: "right" as const };

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>方面別統計</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "#64748b" }}>
            <th style={{ ...cellStyle, textAlign: "left" }}>#</th>
            <th style={{ ...cellStyle, textAlign: "left" }}>方面</th>
            <th style={rightCell}>湧き</th>
            <th style={rightCell}>撃破</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i}>
              <td style={cellStyle}>{i + 1}</td>
              <td style={cellStyle}>{resolveName(s.direction)}</td>
              <td style={rightCell}>{s.spawnCount}</td>
              <td style={rightCell}>{s.defeatCount}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td style={cellStyle} />
            <td style={cellStyle}>合計</td>
            <td style={rightCell}>{totalGrillCount}</td>
            <td style={rightCell}>{totalDefeatCount}</td>
          </tr>
        </tbody>
      </table>

      {hasDuplicateIds && (
        <div style={{ marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          <h4 style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>方面名別合計</h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#64748b" }}>
                <th style={{ ...cellStyle, textAlign: "left" }}>方面</th>
                <th style={rightCell}>湧き</th>
                <th style={rightCell}>撃破</th>
              </tr>
            </thead>
            <tbody>
              {[...idAgg.entries()].map(([id, counts]) => (
                <tr key={id}>
                  <td style={cellStyle}>{resolveName(id)}</td>
                  <td style={rightCell}>{counts.spawnCount}</td>
                  <td style={rightCell}>{counts.defeatCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
