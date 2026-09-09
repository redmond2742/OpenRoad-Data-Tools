import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CARDINAL_DIRECTIONS, cn, directionToDegrees } from "openroad";
import { useEffect, useState } from "react";

type Mode = "none" | "cardinal" | "degrees";

function modeOf(value: string | null | undefined): Mode {
  if (value == null || value.trim() === "") return "none";
  return CARDINAL_DIRECTIONS.some(d => d.code === value.trim().toUpperCase())
    ? "cardinal"
    : "degrees";
}

interface DirectionInputProps {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Compact variant for use inside a map popup. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Picker for a point's approach direction: none, one of the four general
 * headings, or an exact compass bearing. Emits the token that goes straight
 * into the CSV ("NB", "135", or null).
 */
export default function DirectionInput({ value, onChange, size = "md", className }: DirectionInputProps) {
  const [mode, setMode] = useState<Mode>(() => modeOf(value));
  // Kept separate from `value` so the field can hold a partially typed number
  // (e.g. "" while the user clears it) without wiping the stored direction.
  const [degreesDraft, setDegreesDraft] = useState<string>(() =>
    modeOf(value) === "degrees" ? String(value) : ""
  );

  // Re-sync when the caller swaps in a different point.
  useEffect(() => {
    const next = modeOf(value);
    setMode(next);
    setDegreesDraft(next === "degrees" ? String(value) : "");
  }, [value]);

  const btnSize = size === "sm" ? "h-6 px-1.5 text-[11px]" : "h-7 px-2 text-xs";

  const selectMode = (next: Mode) => {
    setMode(next);
    if (next === "none") onChange(null);
    if (next === "degrees") onChange(degreesDraft.trim() === "" ? "0" : degreesDraft.trim());
    if (next === "cardinal") onChange("NB");
  };

  const handleDegrees = (raw: string) => {
    setDegreesDraft(raw);
    const trimmed = raw.trim();
    if (trimmed === "") return; // wait for a real value before committing
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return;
    onChange(String(((num % 360) + 360) % 360));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-1">
        {(["none", "cardinal", "degrees"] as Mode[]).map((m) => (
          <Button
            key={m}
            type="button"
            variant={mode === m ? "default" : "outline"}
            className={cn(btnSize, "capitalize")}
            onClick={() => selectMode(m)}
            data-testid={`button-direction-mode-${m}`}
          >
            {m === "none" ? "None" : m === "cardinal" ? "NB/SB/EB/WB" : "Degrees"}
          </Button>
        ))}
      </div>

      {mode === "cardinal" && (
        <div className="flex gap-1">
          {CARDINAL_DIRECTIONS.map((d) => (
            <Button
              key={d.code}
              type="button"
              variant={value?.toUpperCase() === d.code ? "default" : "outline"}
              className={cn(btnSize, "flex-1")}
              onClick={() => onChange(d.code)}
              title={`${d.label} — ${d.degrees}°`}
              data-testid={`button-direction-${d.code}`}
            >
              {d.code}
            </Button>
          ))}
        </div>
      )}

      {mode === "degrees" && (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={360}
            value={degreesDraft}
            onChange={(e) => handleDegrees(e.target.value)}
            placeholder="0–360"
            className={size === "sm" ? "h-7 text-xs" : "h-8 text-sm"}
            data-testid="input-direction-degrees"
          />
          <span className="text-xs text-grey-500">° from north</span>
        </div>
      )}

      {mode !== "none" && directionToDegrees(value) !== null && (
        <p className="text-[11px] text-grey-500">
          Traffic travels toward {directionToDegrees(value)}°, so it approaches from{" "}
          {((directionToDegrees(value)! + 180) % 360)}°.
        </p>
      )}
    </div>
  );
}
