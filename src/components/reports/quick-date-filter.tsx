"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  QUICK_DATE_PRESETS,
  type QuickDatePreset,
} from "@/lib/utils/report-date-range";

interface QuickDateFilterProps {
  value: QuickDatePreset;
  onChange: (value: Exclude<QuickDatePreset, "custom">) => void;
  onOpenCustom: () => void;
}

export function QuickDateFilter({
  value,
  onChange,
  onOpenCustom,
}: QuickDateFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = QUICK_DATE_PRESETS.find((preset) => preset.value === value)?.label
    ?? "نطاق مخصص";

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const select = (preset: QuickDatePreset) => {
    setOpen(false);
    if (preset === "custom") onOpenCustom();
    else onChange(preset);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <Button
        type="button"
        variant="outline"
        className="w-full min-w-0 justify-between gap-1.5 px-3 sm:w-auto"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open && "rotate-180")} />
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="اختيار الفترة الزمنية"
          className="absolute right-0 z-30 mt-2 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl"
        >
          {QUICK_DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              role="menuitemradio"
              aria-checked={preset.value === value}
              className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm text-primary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              onClick={() => select(preset.value)}
            >
              <span>{preset.label}</span>
              {preset.value === value && <Check className="h-4 w-4 text-secondary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
