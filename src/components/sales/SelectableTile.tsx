import type { ComponentType, ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function SelectableTile({
  checked,
  disabled,
  icon: Icon,
  title,
  description,
  trailing,
  onSelect,
  selectionRole = "radio",
}: {
  checked: boolean;
  disabled?: boolean;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  trailing?: ReactNode;
  onSelect: () => void;
  selectionRole?: "radio" | "checkbox";
}) {
  return (
    <button
      type="button"
      role={selectionRole}
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
        "focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none",
        checked
          ? "border-primary bg-primary/8 shadow-sm"
          : "bg-card hover:border-primary/40 hover:bg-accent/60",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          checked
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        {description ? (
          <span className="text-muted-foreground block text-sm">{description}</span>
        ) : null}
      </span>
      {trailing}
      {checked ? (
        <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full">
          <Check className="size-4" />
        </span>
      ) : null}
    </button>
  );
}
