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
}

export function useTimelineDrag(
  pixelYToFrame: (pixelY: number) => FrameTime,
  validatePosition: (defeatId: string, frameTime: FrameTime) => boolean,
  onDragEnd: (defeatId: string, frameTime: FrameTime) => void,
  laneRef: React.RefObject<HTMLDivElement | null>,
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragDefeatId: null,
    dragFrameTime: null,
    isValidPosition: true,
  });

  const candidateRef = useRef<{ defeatId: string; startY: number } | null>(null);

  const startDragCandidate = useCallback(
    (defeatId: string, startY: number) => {
      candidateRef.current = { defeatId, startY };
    },
    [],
  );

  const cancelDrag = useCallback(() => {
    candidateRef.current = null;
    setDragState({
      isDragging: false,
      dragDefeatId: null,
      dragFrameTime: null,
      isValidPosition: true,
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const candidate = candidateRef.current;
      if (!candidate) return;

      const distance = Math.abs(e.clientY - candidate.startY);

      if (!dragState.isDragging && distance < DRAG_THRESHOLD) return;

      // ドラッグ開始 or 継続
      if (!laneRef.current) return;
      const rect = laneRef.current.getBoundingClientRect();
      const pixelY = Math.max(0, e.clientY - rect.top);
      const frameTime = pixelYToFrame(pixelY);
      const isValid = validatePosition(candidate.defeatId, frameTime);

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

      if (dragState.isDragging && dragState.dragFrameTime !== null && dragState.isValidPosition) {
        onDragEnd(candidate.defeatId, dragState.dragFrameTime);
      }

      candidateRef.current = null;
      setDragState({
        isDragging: false,
        dragDefeatId: null,
        dragFrameTime: null,
        isValidPosition: true,
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrag();
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
  }, [dragState.isDragging, dragState.dragFrameTime, dragState.isValidPosition, pixelYToFrame, validatePosition, onDragEnd, cancelDrag, laneRef]);

  return { dragState, startDragCandidate, cancelDrag };
}
