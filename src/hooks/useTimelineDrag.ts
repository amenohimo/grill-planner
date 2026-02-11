import { useState, useCallback, useEffect, useRef } from 'react';
import type { FrameTime } from '@/types';

const DRAG_THRESHOLD = 5; // ドラッグ開始閾値（ピクセル）

export interface DragState {
  isDragging: boolean;
  dragDefeatId: string | null;
  dragFrameTime: FrameTime | null;
  isValidPosition: boolean;
}

export interface UseTimelineDragReturn {
  dragState: DragState;
  startDragCandidate: (defeatId: string, startY: number) => void;
  cancelDrag: () => void;
  justFinishedDragRef: React.RefObject<boolean>;
}

const INITIAL_STATE: DragState = {
  isDragging: false,
  dragDefeatId: null,
  dragFrameTime: null,
  isValidPosition: true,
};

export function useTimelineDrag(
  pixelYToFrame: (pixelY: number) => FrameTime,
  validatePosition: (defeatId: string, frameTime: FrameTime) => boolean,
  onDragEnd: (defeatId: string, frameTime: FrameTime) => void,
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

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const candidateRef = useRef<{ defeatId: string; startY: number } | null>(null);
  const justFinishedDragRef = useRef(false);

  const startDragCandidate = useCallback(
    (defeatId: string, startY: number) => {
      candidateRef.current = { defeatId, startY };
    },
    [],
  );

  const cancelDrag = useCallback(() => {
    candidateRef.current = null;
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
      const isValid = validatePositionRef.current(candidate.defeatId, frameTime);

      setDragState({
        isDragging: true,
        dragDefeatId: candidate.defeatId,
        dragFrameTime: frameTime,
        isValidPosition: isValid,
      });
    };

    const handleMouseUp = () => {
      const candidate = candidateRef.current;
      if (!candidate) return;

      const state = dragStateRef.current;
      if (state.isDragging && state.dragFrameTime !== null && state.isValidPosition) {
        onDragEndRef.current(candidate.defeatId, state.dragFrameTime);
      }

      // ドラッグ操作（候補含む）の直後の click イベントを抑止するフラグ
      justFinishedDragRef.current = true;
      requestAnimationFrame(() => {
        justFinishedDragRef.current = false;
      });

      candidateRef.current = null;
      setDragState(INITIAL_STATE);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        candidateRef.current = null;
        setDragState(INITIAL_STATE);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [laneRef]);

  return { dragState, startDragCandidate, cancelDrag, justFinishedDragRef };
}
