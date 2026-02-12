interface HeaderProps {
  onExport?: () => void;
  onImport?: () => void;
}

export function Header({ onExport, onImport }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <h1 className="text-lg font-bold text-text">Grill Planner</h1>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onExport}
          className="rounded-sm border border-border bg-surface px-3 py-1 text-sm text-text hover:bg-bg"
        >
          エクスポート
        </button>
        <button
          type="button"
          onClick={onImport}
          className="rounded-sm border border-border bg-surface px-3 py-1 text-sm text-text hover:bg-bg"
        >
          インポート
        </button>
      </div>
    </header>
  );
}
