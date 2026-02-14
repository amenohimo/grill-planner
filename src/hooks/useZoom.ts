import { useCallback, useState } from "react";
import type { DisplayMode } from "@/types";

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

// ============================================================
// カラーテーマ
// ============================================================

const STORAGE_KEY_COLOR_THEME = "grill-planner-color-theme";

export type ColorThemeKey = "flower" | "pastel" | "kasumi";

export const COLOR_THEMES: Record<ColorThemeKey, { label: string; colors: [string, string, string] }> = {
  flower: { label: "花", colors: ["#fce4ec", "#e3f2fd", "#e8f5e9"] },
  pastel: { label: "パステル", colors: ["#fee2e2", "#dbeafe", "#dcfce7"] },
  kasumi: { label: "霞", colors: ["#fdf4f4", "#f4f8fd", "#f4faf5"] },
};

const DEFAULT_COLOR_THEME: ColorThemeKey = "flower";

export function useColorTheme() {
  const [themeKey, setThemeKeyState] = useState<ColorThemeKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLOR_THEME);
    return saved && saved in COLOR_THEMES ? (saved as ColorThemeKey) : DEFAULT_COLOR_THEME;
  });

  const setThemeKey = useCallback((key: ColorThemeKey) => {
    setThemeKeyState(key);
    localStorage.setItem(STORAGE_KEY_COLOR_THEME, key);
  }, []);

  const theme = COLOR_THEMES[themeKey];

  return { themeKey, setThemeKey, theme };
}

// ============================================================
// 表示モード
// ============================================================

const STORAGE_KEY_DISPLAY_MODE = "grill-planner-display-mode";
const VALID_DISPLAY_MODES: readonly DisplayMode[] = ["icon", "text", "both"];
const DEFAULT_DISPLAY_MODE: DisplayMode = "both";

export function useDisplayMode() {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DISPLAY_MODE);
    return saved && VALID_DISPLAY_MODES.includes(saved as DisplayMode) ? (saved as DisplayMode) : DEFAULT_DISPLAY_MODE;
  });

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayModeState(mode);
    localStorage.setItem(STORAGE_KEY_DISPLAY_MODE, mode);
  }, []);

  return { displayMode, setDisplayMode };
}
