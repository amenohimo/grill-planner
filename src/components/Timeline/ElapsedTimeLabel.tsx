import { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import type { FrameTime } from "@/types";
import { framesToSeconds } from "@/utils/calculations";
import { MARKER_CENTER_RATIO, scaledFrameToPixelY } from "./coordinates";

interface ElapsedTimeLabelProps {
  spawnFrame: FrameTime;
  defeatFrame: FrameTime;
  defeatId: string;
  scaleX: number;
  scaleY: number;
  onTimeEdit?: (defeatId: string, newSeconds: number, isLinked: boolean) => boolean;
}

export function ElapsedTimeLabel({
  spawnFrame,
  defeatFrame,
  defeatId,
  scaleX,
  scaleY,
  onTimeEdit,
}: ElapsedTimeLabelProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const spawnY = scaledFrameToPixelY(spawnFrame, scaleY);
  const defeatY = scaledFrameToPixelY(defeatFrame, scaleY);
  const midY = (spawnY + defeatY) / 2;

  const spawnSeconds = framesToSeconds(spawnFrame);
  const defeatSeconds = framesToSeconds(defeatFrame);
  const elapsed = Math.round((spawnSeconds - defeatSeconds) * 10) / 10;

  const minScale = Math.min(scaleX, scaleY);
  const fontSize = Math.max(14 * minScale, 9);

  const startEdit = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (!onTimeEdit) return;
      setEditValue(String(elapsed));
      setEditing(true);
    },
    [elapsed, onTimeEdit],
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const confirmEdit = useCallback(
    (isLinked = false) => {
      setEditing(false);
      const inputSeconds = Number.parseFloat(editValue);
      if (Number.isNaN(inputSeconds) || inputSeconds < 0) return;
      const newDefeatSeconds = spawnSeconds - inputSeconds;
      if (newDefeatSeconds < 0 || newDefeatSeconds > 100) return;
      onTimeEdit?.(defeatId, newDefeatSeconds, isLinked);
    },
    [editValue, spawnSeconds, defeatId, onTimeEdit],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        confirmEdit(e.shiftKey);
      } else if (e.key === "Escape") {
        setEditing(false);
      }
    },
    [confirmEdit],
  );

  const handleInputMouseDown = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="absolute flex items-center justify-end"
      style={{
        top: midY,
        right: `${(1 - MARKER_CENTER_RATIO) * 100}%`,
        transform: "translateY(-50%)",
        zIndex: 3,
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          step={0.1}
          min={0}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => confirmEdit(false)}
          onMouseDown={handleInputMouseDown}
          style={{
            width: 48,
            marginRight: 4,
            fontSize,
            textAlign: "center",
            border: "1px solid var(--color-border)",
            borderRadius: 2,
            padding: "1px 2px",
            backgroundColor: "white",
          }}
        />
      ) : (
        <span
          className="cursor-text select-none whitespace-nowrap"
          style={{
            marginRight: 4,
            fontSize,
            color: "var(--color-text-muted)",
            backgroundColor: "rgba(255,255,255,0.85)",
            padding: "1px 4px",
            borderRadius: 2,
            border: "1px solid var(--color-border)",
          }}
          onClick={startEdit}
        >
          {elapsed}s
        </span>
      )}
    </div>
  );
}
