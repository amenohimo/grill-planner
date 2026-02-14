import { useCallback, useEffect, useRef, useState } from "react";
import type { DefeatPoint, FrameTime } from "@/types";

const DRAG_THRESHOLD = 5; // ドラッグ開始閾値（ピクセル）

export interface LinkedDefeatPreview {
  defeatId: string;
  originalFrameTime: FrameTime;
  newFrameTime: FrameTime;
}

export interface DragState {
  isDragging: boolean;
  dragDefeatId: string | null;
  dragFrameTime: FrameTime | null;
  isValidPosition: boolean;
  isLinkedMode: boolean;
  linkedDefeats: readonly LinkedDefeatPreview[];
}

export interface UseTimelineDragReturn {
  dragState: DragState;
  startDragCandidate: (defeatId: string, startY: number, shiftKey: boolean, originalFrameTime: FrameTime) => void;
  cancelDrag: () => void;
  justFinishedDragRef: React.RefObject<boolean>;
}

const INITIAL_STATE: DragState = {
  isDragging: false,
  dragDefeatId: null,
  dragFrameTime: null,
  isValidPosition: true,
  isLinkedMode: false,
  linkedDefeats: [],
};

export function useTimelineDrag(
  pixelYToFrame: (pixelY: number) => FrameTime,
  validatePosition: (defeatId: string, frameTime: FrameTime) => boolean,
  validateLinkedMove: (moves: ReadonlyArray<{ defeatId: string; frameTime: FrameTime }>) => boolean,
  onDragEnd: (defeatId: string, frameTime: FrameTime) => void,
  onLinkedDragEnd: (moves: ReadonlyArray<{ defeatId: string; frameTime: FrameTime }>) => void,
  getLinkedDefeats: (defeatId: string) => DefeatPoint[],
  laneRef: React.RefObject<HTMLDivElement | null>,
) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_STATE);

  // Ref でコールバックと状態を保持し、useEffect の依存配列から除外
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const pixelYToFrameRef = useRef(pixelYToFrame);
  pixelYToFrameRef.current = pixelYToFrame;

  const validatePositionRef = useRef(validatePosition);
  validatePositionRef.current = validatePosition;

  const validateLinkedMoveRef = useRef(validateLinkedMove);
  validateLinkedMoveRef.current = validateLinkedMove;

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const onLinkedDragEndRef = useRef(onLinkedDragEnd);
  onLinkedDragEndRef.current = onLinkedDragEnd;

  const getLinkedDefeatsRef = useRef(getLinkedDefeats);
  getLinkedDefeatsRef.current = getLinkedDefeats;

  const candidateRef = useRef<{
    defeatId: string;
    startY: number;
    shiftKey: boolean;
    originalFrameTime: FrameTime;
  } | null>(null);
  const linkedDefeatsSnapshotRef = useRef<DefeatPoint[]>([]);
  const justFinishedDragRef = useRef(false);

  const startDragCandidate = useCallback(
    (defeatId: string, startY: number, shiftKey: boolean, originalFrameTime: FrameTime) => {
      candidateRef.current = { defeatId, startY, shiftKey, originalFrameTime };
      linkedDefeatsSnapshotRef.current = shiftKey ? getLinkedDefeatsRef.current(defeatId) : [];
    },
    [],
  );

  const cancelDrag = useCallback(() => {
    candidateRef.current = null;
    linkedDefeatsSnapshotRef.current = [];
    setDragState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const candidate = candidateRef.current;
      if (!candidate) return;

      const distance = Math.abs(e.clientY - candidate.startY);

      if (!dragStateRef.current.isDragging && distance < DRAG_THRESHOLD) return;

      // ドラッグ開始 or 継続
      if (!laneRef.current) return;
      const rect = laneRef.current.getBoundingClientRect();
      const pixelY = Math.max(0, e.clientY - rect.top);
      const frameTime = pixelYToFrameRef.current(pixelY);

      if (candidate.shiftKey) {
        // 連動モード
        const delta = frameTime - candidate.originalFrameTime;
        const linkedPreviews: LinkedDefeatPreview[] = linkedDefeatsSnapshotRef.current.map((d) => ({
          defeatId: d.id,
          originalFrameTime: d.frameTime,
          newFrameTime: d.frameTime + delta,
        }));

        // 全体バリデーション
        const allMoves = [
          { defeatId: candidate.defeatId, frameTime },
          ...linkedPreviews.map((lp) => ({ defeatId: lp.defeatId, frameTime: lp.newFrameTime })),
        ];
        const isValid = validateLinkedMoveRef.current(allMoves);

        setDragState({
          isDragging: true,
          dragDefeatId: candidate.defeatId,
          dragFrameTime: frameTime,
          isValidPosition: isValid,
          isLinkedMode: true,
          linkedDefeats: linkedPreviews,
        });
      } else {
        // 個別モード（従来）
        const isValid = validatePositionRef.current(candidate.defeatId, frameTime);

        setDragState({
          isDragging: true,
          dragDefeatId: candidate.defeatId,
          dragFrameTime: frameTime,
          isValidPosition: isValid,
          isLinkedMode: false,
          linkedDefeats: [],
        });
      }
    };

    const handleMouseUp = () => {
      const candidate = candidateRef.current;
      if (!candidate) return;

      const state = dragStateRef.current;
      if (state.isDragging && state.dragFrameTime !== null && state.isValidPosition) {
        if (state.isLinkedMode && state.linkedDefeats.length > 0) {
          const allMoves = [
            { defeatId: candidate.defeatId, frameTime: state.dragFrameTime },
            ...state.linkedDefeats.map((lp) => ({ defeatId: lp.defeatId, frameTime: lp.newFrameTime })),
          ];
          onLinkedDragEndRef.current(allMoves);
        } else {
          onDragEndRef.current(candidate.defeatId, state.dragFrameTime);
        }
      }

      // ドラッグ操作（候補含む）の直後の click イベントを抑止するフラグ
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => {
        justFinishedDragRef.current = false;
      });

      candidateRef.current = null;
      linkedDefeatsSnapshotRef.current = [];
      setDragState(INITIAL_STATE);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        candidateRef.current = null;
        linkedDefeatsSnapshotRef.current = [];
        setDragState(INITIAL_STATE);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [laneRef]);

  return { dragState, startDragCandidate, cancelDrag, justFinishedDragRef };
}
