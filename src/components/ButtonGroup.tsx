interface ButtonGroupOption<T extends string> {
  value: T;
  label: string;
  icon?: string | null;
}

interface ButtonGroupProps<T extends string> {
  options: readonly ButtonGroupOption<T>[];
  selected: T;
  onChange: (value: T) => void;
}

export function ButtonGroup<T extends string>({ options, selected, onChange }: ButtonGroupProps<T>) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={[
            "flex items-center px-2 py-0.5 text-xs",
            i > 0 ? "border-l border-border" : "",
            selected === option.value ? "bg-primary text-white" : "bg-surface text-text hover:bg-bg",
          ].join(" ")}
        >
          {option.label}
          {option.icon !== undefined && (
            <div className="ml-0.5 h-5 w-5 shrink-0">
              {option.icon && <img src={option.icon} alt="" className="h-5 w-5" />}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
