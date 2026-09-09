import { clsx, type ClassValue } from "clsx";
import type { KeyboardEvent } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Tab / Shift+Tab navigation that moves DOWN a column instead of across a row.
 * Attach to a table (or wrapping container) via onKeyDown. Each focusable cell
 * must carry `data-tab-col` and `data-tab-row` attributes. Focusable elements
 * without those attributes are left to the browser's default tab behavior.
 */
export function handleColumnMajorTab(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const target = e.target as HTMLElement;
  if (target.dataset.tabCol == null || target.dataset.tabRow == null) return;

  const cells = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("[data-tab-col][data-tab-row]")
  ).filter(el => !(el as HTMLInputElement).disabled);

  // Column-major order: all rows of column 0, then column 1, etc.
  cells.sort((a, b) => {
    const ca = Number(a.dataset.tabCol);
    const cb = Number(b.dataset.tabCol);
    if (ca !== cb) return ca - cb;
    return Number(a.dataset.tabRow) - Number(b.dataset.tabRow);
  });

  const idx = cells.indexOf(target);
  if (idx === -1) return;
  const next = cells[e.shiftKey ? idx - 1 : idx + 1];
  if (next) {
    e.preventDefault();
    next.focus();
    if (next instanceof HTMLInputElement) next.select();
  }
}

// The four general headings, in compass order. The value is the direction of
// TRAVEL — northbound traffic is heading 0°, so it arrives from the south.
export const CARDINAL_DIRECTIONS = [
  { code: "NB", label: "Northbound", degrees: 0 },
  { code: "EB", label: "Eastbound", degrees: 90 },
  { code: "SB", label: "Southbound", degrees: 180 },
  { code: "WB", label: "Westbound", degrees: 270 },
] as const;

export type CardinalCode = (typeof CARDINAL_DIRECTIONS)[number]["code"];

/**
 * Resolve a stored direction token to a bearing in degrees, or null when no
 * direction is set. Accepts the cardinal codes and any numeric string.
 */
export function directionToDegrees(direction: string | null | undefined): number | null {
  if (direction == null) return null;
  const raw = direction.trim();
  if (raw === "") return null;

  const cardinal = CARDINAL_DIRECTIONS.find(d => d.code === raw.toUpperCase());
  if (cardinal) return cardinal.degrees;

  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return ((num % 360) + 360) % 360;
}

// Spellings accepted for a direction on import, beyond the four codes and a
// bare number. Written-out headings are what spreadsheets actually contain, and
// the intercardinals resolve to their bearing so nothing is lost.
const DIRECTION_SYNONYMS: Record<string, string> = {
  N: "NB", NORTH: "NB", NORTHBOUND: "NB", NB: "NB",
  S: "SB", SOUTH: "SB", SOUTHBOUND: "SB", SB: "SB",
  E: "EB", EAST: "EB", EASTBOUND: "EB", EB: "EB",
  W: "WB", WEST: "WB", WESTBOUND: "WB", WB: "WB",
  NE: "45", NORTHEAST: "45", NORTHEASTBOUND: "45",
  SE: "135", SOUTHEAST: "135", SOUTHEASTBOUND: "135",
  SW: "225", SOUTHWEST: "225", SOUTHWESTBOUND: "225",
  NW: "315", NORTHWEST: "315", NORTHWESTBOUND: "315",
};

/**
 * Canonical direction token for a raw value, or `undefined` when it isn't a
 * direction at all. An empty value normalizes to `null` — direction is optional.
 *
 * Values already in canonical form pass through untouched, so a file exported
 * from this tool round-trips byte-for-byte.
 */
export function normalizeDirection(raw: string | null | undefined): string | null | undefined {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const word = DIRECTION_SYNONYMS[trimmed.toUpperCase().replace(/[\s_-]/g, "")];
  if (word) return word;

  const num = Number(trimmed);
  if (Number.isFinite(num) && num >= 0 && num <= 360) {
    return String(((num % 360) + 360) % 360);
  }
  return undefined;
}

/** True when a raw string is usable as a direction. */
export function isValidDirection(raw: string): boolean {
  return normalizeDirection(raw) !== undefined;
}

/** Human-readable form of a direction token, e.g. "NB" -> "Northbound (0°)". */
export function formatDirection(direction: string | null | undefined): string {
  if (direction == null || direction.trim() === "") return "";
  const raw = direction.trim();
  const cardinal = CARDINAL_DIRECTIONS.find(d => d.code === raw.toUpperCase());
  if (cardinal) return `${cardinal.label} (${cardinal.degrees}°)`;
  return `${raw}°`;
}

/**
 * Initial compass bearing travelling from one lat/lng to another, 0-360.
 * The inverse of `projectPoint`: given where traffic comes from and where the
 * point is, this is the heading it travels.
 */
export function bearingBetween(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const phi1 = toRad(fromLat);
  const phi2 = toRad(toLat);
  const deltaLambda = toRad(toLng - fromLng);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/**
 * Project a lat/lng along a compass bearing by a great-circle distance in
 * meters. Used to place the tail and arrow barbs of the direction line.
 */
export function projectPoint(
  lat: number,
  lng: number,
  bearing: number,
  distanceMeters: number
): [number, number] {
  const R = 6371000; // Earth's radius in meters
  const bearingRad = (bearing * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / R) +
    Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearingRad)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distanceMeters / R) * Math.cos(lat1),
    Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI];
}
