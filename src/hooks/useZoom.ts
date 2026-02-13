import { useCallback, useState } from "react";

const STORAGE_KEY_X = "grill-planner-zoom-x";
const STORAGE_KEY_Y = "grill-planner-zoom-y";
export const ZOOM_OPTIONS = [50, 75, 100, 150, 200] as const;
const DEFAULT_ZOOM = 100;

function readZoom(key: string): number {
  const saved = localStorage.getItem(key);
  const val = saved ? Number(saved) : DEFAULT_ZOOM;
  return (ZOOM_OPTIONS as readonly number[]).includes(val) ? val : DEFAULT_ZOOM;
}

export function useZoom() {
  const [zoomX, setZoomXState] = useState(() => readZoom(STORAGE_KEY_X));
  const [zoomY, setZoomYState] = useState(() => readZoom(STORAGE_KEY_Y));

  const setZoomX = useCallback((val: number) => {
    setZoomXState(val);
    localStorage.setItem(STORAGE_KEY_X, String(val));
  }, []);

  const setZoomY = useCallback((val: number) => {
    setZoomYState(val);
    localStorage.setItem(STORAGE_KEY_Y, String(val));
  }, []);

  const scaleX = zoomX / 100;
  const scaleY = zoomY / 100;

  return { zoomX, zoomY, scaleX, scaleY, setZoomX, setZoomY };
}
