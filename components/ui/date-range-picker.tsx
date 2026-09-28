"use client";

import { useId } from "react";
import { Calendar, X } from "lucide-react";

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: DateRange) => void;
  showPresets?: boolean;
  className?: string;
  label?: string;
}

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  showPresets = true,
  className = "",
  label,
}: DateRangePickerProps) {
  const fromId = useId();
  const toId = useId();

  const handlePreset = (type: "today" | "yesterday" | "7d" | "30d" | "month" | "clear") => {
    const today = new Date();
    const todayStr = formatDateString(today);

    switch (type) {
      case "today":
        onChange({ startDate: todayStr, endDate: todayStr });
        break;
      case "yesterday": {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = formatDateString(y);
        onChange({ startDate: yStr, endDate: yStr });
        break;
      }
      case "7d": {
        const past = new Date();
        past.setDate(past.getDate() - 6);
        onChange({ startDate: formatDateString(past), endDate: todayStr });
        break;
      }
      case "30d": {
        const past = new Date();
        past.setDate(past.getDate() - 29);
        onChange({ startDate: formatDateString(past), endDate: todayStr });
        break;
      }
      case "month": {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        onChange({ startDate: formatDateString(firstDay), endDate: todayStr });
        break;
      }
      case "clear":
        onChange({ startDate: "", endDate: "" });
        break;
    }
  };

  const hasRange = Boolean(startDate || endDate);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          {label}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* From Date */}
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[11px] font-medium text-text-muted pointer-events-none select-none uppercase tracking-wider">
            From
          </span>
          <input
            id={fromId}
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => onChange({ startDate: e.target.value, endDate })}
            onClick={(e) => {
              try {
                (e.currentTarget as HTMLInputElement).showPicker?.();
              } catch (_) { }
            }}
            className="input-surface pl-12 pr-2.5 py-1.5 text-xs text-foreground font-medium rounded-lg cursor-pointer min-w-[140px] hover:border-primary/50 transition focus:ring-1 focus:ring-primary"
            aria-label="Start date"
          />
        </div>

        <span className="text-text-muted text-xs font-bold select-none">→</span>

        {/* To Date */}
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[11px] font-medium text-text-muted pointer-events-none select-none uppercase tracking-wider">
            To
          </span>
          <input
            id={toId}
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onChange({ startDate, endDate: e.target.value })}
            onClick={(e) => {
              try {
                (e.currentTarget as HTMLInputElement).showPicker?.();
              } catch (_) { }
            }}
            className="input-surface pl-8 pr-2.5 py-1.5 text-xs text-foreground font-medium rounded-lg cursor-pointer min-w-[130px] hover:border-primary/50 transition focus:ring-1 focus:ring-primary"
            aria-label="End date"
          />
        </div>

        {/* Clear Button */}
        {hasRange && (
          <button
            type="button"
            onClick={() => handlePreset("clear")}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-danger rounded-md hover:bg-surface-muted transition"
            title="Clear date range"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Preset pills */}
      {showPresets && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mr-0.5">
            Presets:
          </span>
          <button
            type="button"
            onClick={() => handlePreset("today")}
            className="px-2 py-0.5 text-[11px] rounded-md border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted transition active:scale-95"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handlePreset("yesterday")}
            className="px-2 py-0.5 text-[11px] rounded-md border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted transition active:scale-95"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => handlePreset("7d")}
            className="px-2 py-0.5 text-[11px] rounded-md border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted transition active:scale-95"
          >
            Last 7D
          </button>
          <button
            type="button"
            onClick={() => handlePreset("30d")}
            className="px-2 py-0.5 text-[11px] rounded-md border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted transition active:scale-95"
          >
            Last 30D
          </button>
          <button
            type="button"
            onClick={() => handlePreset("month")}
            className="px-2 py-0.5 text-[11px] rounded-md border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted transition active:scale-95"
          >
            This Month
          </button>
        </div>
      )}
    </div>
  );
}
