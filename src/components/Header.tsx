import { useCallback, useState } from "react";

type ExportState = "idle" | "exporting" | "done";

interface HeaderProps {
  onExport?: () => void;
  onImport?: () => void;
}

export function Header({ onExport, onImport }: HeaderProps) {
  const [exportState, setExportState] = useState<ExportState>("idle");

  const handleExport = useCallback(async () => {
    if (exportState !== "idle") return;
    setExportState("exporting");

    await new Promise((resolve) => requestAnimationFrame(resolve));
    onExport?.();

    setExportState("done");
    setTimeout(() => setExportState("idle"), 2000);
  }, [exportState, onExport]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <h1 className="text-lg font-bold text-text">Grill Planner</h1>
      <div className="flex gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={handleExport}
            disabled={exportState === "exporting"}
            className="rounded-sm border border-border bg-surface px-3 py-1 text-sm text-text transition-transform duration-100 hover:bg-bg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportState === "exporting" ? "エクスポート中..." : "エクスポート"}
          </button>
          {exportState === "done" && (
            <div
              className="absolute top-full right-0 mt-1 whitespace-nowrap rounded-sm bg-text px-2 py-1 text-xs text-surface"
              style={{ zIndex: 30 }}
            >
              エクスポート完了
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onImport}
          className="rounded-sm border border-border bg-surface px-3 py-1 text-sm text-text transition-transform duration-100 hover:bg-bg active:scale-95"
        >
          インポート
        </button>
      </div>
    </header>
  );
}
