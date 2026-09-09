import { customAlphabet, nanoid } from 'nanoid';
import type { InsertPoint, Point } from './schema/schema';
import { normalizeDirection } from './utils';

// Storage keys
const STORAGE_KEYS = {
  POINTS: 'openroad_points',
  SETTINGS: 'openroad_settings',
  ID_COUNTER: 'openroad_id_counter',
};

// Maximum localStorage size (5MB)
const MAX_STORAGE_SIZE = 5 * 1024 * 1024;

// The canonical points.csv header. Import is lenient about column names and
// order (see COLUMN_ALIASES); export always writes exactly this.
export const POINTS_CSV_HEADER = 'id,latitude,longitude,direction,description,distance_ft';

export const POINTS_FILENAME = 'points.csv';

// Generator for unique point IDs. The alphabet is deliberately alphanumeric:
// nanoid's default includes '-' and '_', and an ID starting with '-' would trip
// the CSV formula-injection guard below and come back altered on re-import.
const UNIQUE_ID_LENGTH = 10;
const uniqueId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', UNIQUE_ID_LENGTH);

// CSV sanitization to prevent formula injection attacks
function sanitizeCSVField(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';

  // For numeric and boolean values, just convert to string (no formula risk)
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  const strValue = String(value);

  // Quote fields containing commas, quotes, or newlines
  if (/[",\n\r]/.test(strValue)) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }

  // Escape dangerous characters that could start formulas in spreadsheet applications
  // Characters =, +, -, @, tab, carriage return can trigger formula execution
  // Only apply to string values that aren't already quoted
  if (/^[=+\-@\t\r]/.test(strValue)) {
    // Prepend single quote to neutralize formula execution and wrap in quotes
    return `"'${strValue.replace(/"/g, '""')}"`;
  }

  return strValue;
}

// Proper CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        field += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }

  // Push the last field
  fields.push(field.trim());
  return fields;
}

// Safer number validation without ReDoS risk
function isValidNumber(value: string): boolean {
  if (!value || value.trim() === '') return false;
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
}

// Check for prototype pollution attempts
function hasPrototypePollution(obj: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(obj, '__proto__') ||
    Object.prototype.hasOwnProperty.call(obj, 'constructor') ||
    Object.prototype.hasOwnProperty.call(obj, 'prototype');
}

// Helper function to safely parse JSON from localStorage
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Helper function to save to localStorage with size limit check
function saveToStorage<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);

    // Check size before saving
    if (serialized.length > MAX_STORAGE_SIZE) {
      throw new Error('Data too large for localStorage. Please reduce the number of records.');
    }

    localStorage.setItem(key, serialized);
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded');
      throw new Error('Storage quota exceeded. Please delete some data before adding more.');
    }
    console.error('Failed to save to localStorage:', error);
    throw error;
  }
}

// Settings operations
export type PointSettings = {
  // false: point IDs count up 1, 2, 3, …
  // true:  each point gets a random 10-character ID so IDs stay unique when
  //        datasets from different people or sessions are merged.
  useUniqueIds: boolean;
};

export const DEFAULT_SETTINGS: PointSettings = {
  useUniqueIds: false,
};

export const settingsStorage = {
  get: (): PointSettings => {
    const stored = getFromStorage<Partial<PointSettings>>(STORAGE_KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...stored };
  },

  save: (settings: PointSettings): PointSettings => {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
    return settings;
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  },
};

// High-water mark for sequential IDs. Kept separately from the points
// themselves so that deleting a point never frees its number for reuse — an ID
// that has already gone out in an exported CSV should not come back attached to
// a different location.
const idCounterStorage = {
  get: (): number => {
    const raw = getFromStorage<number>(STORAGE_KEYS.ID_COUNTER, 0);
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  },

  set: (value: number): void => {
    saveToStorage(STORAGE_KEYS.ID_COUNTER, value);
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEYS.ID_COUNTER);
  },
};

// Highest sequential number in play: the largest numeric ID currently stored,
// or the counter's high-water mark if the point that set it has been deleted.
// Reading the points too means an import of higher IDs is picked up for free.
function sequentialHighWaterMark(existing: Point[]): number {
  const fromPoints = existing.reduce((max, p) => {
    const n = Number(p.pointId);
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return Math.max(fromPoints, idCounterStorage.get());
}

/** Record a manually entered or imported ID so later points count on past it. */
function rememberId(pointId: string): void {
  const n = Number(pointId);
  if (Number.isInteger(n) && n > idCounterStorage.get()) {
    idCounterStorage.set(n);
  }
}

/**
 * Next ID for a new point: a random one in unique mode, otherwise one past the
 * highest number used so far.
 */
export function nextPointId(existing: Point[], useUniqueIds: boolean): string {
  if (useUniqueIds) return uniqueId();
  return String(sequentialHighWaterMark(existing) + 1);
}

// Point operations
export const pointStorage = {
  getAll: (): Point[] => {
    return getFromStorage<Point[]>(STORAGE_KEYS.POINTS, []);
  },

  get: (pointId: string): Point | undefined => {
    return pointStorage.getAll().find(p => p.pointId === pointId);
  },

  save: (point: InsertPoint): Point => {
    const points = pointStorage.getAll();
    const newPoint: Point = {
      id: nanoid(),
      pointId: point.pointId || nextPointId(points, settingsStorage.get().useUniqueIds),
      latitude: point.latitude,
      longitude: point.longitude,
      direction: point.direction ?? null,
      description: point.description ?? null,
      distanceFt: point.distanceFt ?? 0,
    };

    rememberId(newPoint.pointId);
    saveToStorage(STORAGE_KEYS.POINTS, [...points, newPoint]);
    return newPoint;
  },

  update: (id: string, updates: Partial<InsertPoint>): Point | null => {
    // Prevent prototype pollution
    if (hasPrototypePollution(updates as Record<string, unknown>)) {
      console.error('Attempted prototype pollution in point update');
      return null;
    }

    const points = pointStorage.getAll();
    const index = points.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updatedPoint = { ...points[index], ...updates };
    rememberId(updatedPoint.pointId);
    points[index] = updatedPoint;
    saveToStorage(STORAGE_KEYS.POINTS, points);
    return updatedPoint;
  },

  delete: (id: string): void => {
    const points = pointStorage.getAll().filter(p => p.id !== id);
    saveToStorage(STORAGE_KEYS.POINTS, points);
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEYS.POINTS);
  },
};

// Clear all point data. Settings are intentionally NOT cleared — they are a
// preference, not data. The ID counter does reset, since starting over should
// start numbering at 1 again.
export const clearAllData = (): void => {
  pointStorage.clear();
  idCounterStorage.clear();
};

// Export all data
export const exportData = () => {
  return {
    points: pointStorage.getAll(),
  };
};

// CSV export with sanitization to prevent formula injection
export function generatePointsCSV(points: Point[]): string {
  if (points.length === 0) return POINTS_CSV_HEADER + '\n';

  const rows = points.map(point =>
    [
      sanitizeCSVField(point.pointId),
      sanitizeCSVField(point.latitude),
      sanitizeCSVField(point.longitude),
      sanitizeCSVField(point.direction),
      sanitizeCSVField(point.description),
      sanitizeCSVField(point.distanceFt ?? 0),
    ].join(',')
  );

  return [POINTS_CSV_HEADER, ...rows].join('\n');
}

// Download a file
const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export points.csv on its own
export const exportAsCSV = async (fileName: string = POINTS_FILENAME): Promise<void> => {
  try {
    downloadFile(generatePointsCSV(exportData().points), fileName);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};

// Export as ZIP using JSZip
export const exportAsZip = async (packageName?: string): Promise<void> => {
  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    zip.file(POINTS_FILENAME, generatePointsCSV(exportData().points));

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${packageName || `openroad-export-${new Date().toISOString().split('T')[0]}`}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// CSV import
//
// Import is a three-step pipeline so the UI can put a human in the middle:
//   inspectCSV      raw text  -> rows, and a guess at whether row 1 is a header
//   suggestMapping  headers   -> a proposed source-column -> field mapping
//   buildPoints     rows + mapping -> validated points
// A caller that just wants the happy path uses parsePointsCSV, which chains all
// three with the suggested mapping.
// ---------------------------------------------------------------------------

export type PointField =
  | 'id'
  | 'latitude'
  | 'longitude'
  | 'direction'
  | 'description'
  | 'distanceFt';

export const POINT_FIELDS: {
  field: PointField;
  label: string;
  required: boolean;
  /** Whether several source columns may be joined into this one field. */
  combinable: boolean;
}[] = [
  { field: 'id', label: 'ID', required: false, combinable: true },
  { field: 'latitude', label: 'Latitude', required: true, combinable: false },
  { field: 'longitude', label: 'Longitude', required: true, combinable: false },
  { field: 'direction', label: 'Direction', required: false, combinable: false },
  { field: 'description', label: 'Description', required: false, combinable: true },
  { field: 'distanceFt', label: 'Distance (ft)', required: false, combinable: false },
];

const FIELD_ORDER = POINT_FIELDS.map(f => f.field);

/** Which source columns feed each field. An empty list means "not imported". */
export type ColumnMapping = {
  fields: Record<PointField, number[]>;
  /**
   * Per field, the string joining its columns when several feed it. Kept per
   * field rather than shared because the right joiner differs: a composite ID
   * might want " MP" while a description wants " — ".
   */
  separators: Record<PointField, string>;
};

export const DEFAULT_SEPARATOR = ' ';

const defaultSeparators = (): Record<PointField, string> => ({
  id: DEFAULT_SEPARATOR,
  latitude: DEFAULT_SEPARATOR,
  longitude: DEFAULT_SEPARATOR,
  direction: DEFAULT_SEPARATOR,
  description: DEFAULT_SEPARATOR,
  distanceFt: DEFAULT_SEPARATOR,
});

export type CsvFile = {
  /** Every non-blank parsed line, header row included when there is one. */
  allRows: string[][];
  hasHeaderRow: boolean;
};

// Canonical column order, used for files with no header row.
const CANONICAL_ORDER: PointField[] = [
  'id',
  'latitude',
  'longitude',
  'direction',
  'description',
  'distanceFt',
];

// Header names recognised automatically. Anything unrecognised is left for the
// user to assign (or ignore) rather than guessed at.
const COLUMN_ALIASES: Record<PointField, string[]> = {
  id: ['id', 'id#', 'idnumber', 'pointid', 'point', 'name', 'label', 'key'],
  latitude: ['latitude', 'lat', 'y'],
  longitude: ['longitude', 'lon', 'lng', 'long', 'x'],
  direction: ['direction', 'compassdirection', 'compass', 'bearing', 'heading', 'approach'],
  description: ['description', 'desc', 'notes', 'note', 'comment', 'comments', 'remarks'],
  distanceFt: ['distanceft', 'distance', 'distancefeet', 'dist', 'setback', 'offset'],
};

// Strip everything but letters and digits so "Distance (ft)", "distance_ft"
// and "DISTANCE FT" all collapse to the same key.
const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

const emptyFields = (): Record<PointField, number[]> => ({
  id: [], latitude: [], longitude: [], direction: [], description: [], distanceFt: [],
});

/**
 * Split raw CSV text into rows and guess whether the first one is a header.
 *
 * The guess is deliberately conservative: a first row is only treated as a
 * header when it names neither a valid latitude nor longitude in the position
 * data would occupy, and at least one of its cells is non-numeric.
 */
export function inspectCSV(content: string): CsvFile {
  const allRows = content
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(parseCSVLine);

  if (allRows.length === 0) {
    throw new Error('File is empty');
  }

  const first = allRows[0];
  // A row of data has numbers where coordinates live; a header does not.
  const looksLikeData = first.some(cell => isValidNumber(cell) && Math.abs(Number(cell)) <= 180);
  return { allRows, hasHeaderRow: !looksLikeData };
}

/** Column titles: the header row, or "Column 1", "Column 2", … */
export function csvHeaders(file: CsvFile): string[] {
  const width = file.allRows.reduce((max, row) => Math.max(max, row.length), 0);
  if (file.hasHeaderRow) {
    const header = file.allRows[0];
    return Array.from({ length: width }, (_, i) => header[i]?.trim() || `Column ${i + 1}`);
  }
  return Array.from({ length: width }, (_, i) => `Column ${i + 1}`);
}

/** The rows carrying values, with the header row removed if present. */
export function csvDataRows(file: CsvFile): string[][] {
  return file.hasHeaderRow ? file.allRows.slice(1) : file.allRows;
}

/**
 * Propose a mapping by matching header names against the aliases above. With no
 * header row, fall back to the canonical column order. Columns that match
 * nothing are left unassigned for the user to place or ignore.
 */
export function suggestMapping(file: CsvFile): ColumnMapping {
  const headers = csvHeaders(file);
  const fields = emptyFields();

  if (!file.hasHeaderRow) {
    CANONICAL_ORDER.forEach((field, index) => {
      if (index < headers.length) fields[field] = [index];
    });
    return { fields, separators: defaultSeparators() };
  }

  const normalized = headers.map(normalizeHeader);
  const claimed = new Set<number>();
  FIELD_ORDER.forEach(field => {
    const index = normalized.findIndex(
      (h, i) => h !== '' && !claimed.has(i) && COLUMN_ALIASES[field].includes(h)
    );
    if (index >= 0) {
      fields[field] = [index];
      claimed.add(index);
    }
  });

  return { fields, separators: defaultSeparators() };
}

/** Problems that would make a mapping unusable, phrased for the user. */
export function mappingIssues(mapping: ColumnMapping): string[] {
  const issues: string[] = [];

  POINT_FIELDS.forEach(({ field, label, required, combinable }) => {
    const columns = mapping.fields[field];
    if (required && columns.length === 0) {
      issues.push(`${label} is required — choose which column holds it.`);
    }
    if (!combinable && columns.length > 1) {
      issues.push(`${label} can only come from one column.`);
    }
  });

  return issues;
}

/** The value a mapped field takes for one row, with combined columns joined. */
export function mappedValue(
  row: string[],
  mapping: ColumnMapping,
  field: PointField
): string {
  const parts = mapping.fields[field]
    .map(index => (index < row.length ? row[index].trim() : ''))
    .filter(part => part !== '');
  return parts.join(mapping.separators[field] ?? DEFAULT_SEPARATOR);
}

/**
 * Turn mapped rows into points, collecting every row's problems rather than
 * failing on the first.
 */
export function buildPointsFromCSV(file: CsvFile, mapping: ColumnMapping): Point[] {
  const structural = mappingIssues(mapping);
  if (structural.length > 0) {
    throw new Error(structural.join('\n'));
  }

  const dataRows = csvDataRows(file);
  if (dataRows.length === 0) {
    throw new Error('File contains a header but no data rows');
  }

  const points: Point[] = [];
  const errors: string[] = [];
  const useUniqueIds = settingsStorage.get().useUniqueIds;
  // Row numbers refer to lines in the original file, so an error the user sees
  // points at the line they can actually go and fix.
  const rowOffset = file.hasHeaderRow ? 2 : 1;

  dataRows.forEach((row, i) => {
    const rowNum = i + rowOffset;

    const latRaw = mappedValue(row, mapping, 'latitude');
    const lngRaw = mappedValue(row, mapping, 'longitude');

    if (!isValidNumber(latRaw)) {
      errors.push(`Row ${rowNum}: Latitude must be a valid number, got "${latRaw}"`);
      return;
    }
    if (!isValidNumber(lngRaw)) {
      errors.push(`Row ${rowNum}: Longitude must be a valid number, got "${lngRaw}"`);
      return;
    }

    const latitude = Number(latRaw);
    const longitude = Number(lngRaw);

    if (latitude < -90 || latitude > 90) {
      errors.push(`Row ${rowNum}: Latitude must be between -90 and 90, got "${latRaw}"`);
      return;
    }
    if (longitude < -180 || longitude > 180) {
      errors.push(`Row ${rowNum}: Longitude must be between -180 and 180, got "${lngRaw}"`);
      return;
    }

    const directionRaw = mappedValue(row, mapping, 'direction');
    const direction = normalizeDirection(directionRaw);
    if (direction === undefined) {
      errors.push(
        `Row ${rowNum}: Direction must be a compass heading (NB, SB, EB, WB, NE…), 0-360, or empty, got "${directionRaw}"`
      );
      return;
    }

    const distanceRaw = mappedValue(row, mapping, 'distanceFt');
    let distanceFt = 0;
    if (distanceRaw !== '') {
      if (!isValidNumber(distanceRaw)) {
        errors.push(`Row ${rowNum}: Distance must be a valid number or empty, got "${distanceRaw}"`);
        return;
      }
      distanceFt = Number(distanceRaw);
      if (distanceFt < 0) {
        errors.push(`Row ${rowNum}: Distance cannot be negative, got "${distanceRaw}"`);
        return;
      }
    }

    const description = mappedValue(row, mapping, 'description');
    const idRaw = mappedValue(row, mapping, 'id');

    points.push({
      id: nanoid(),
      // Rows without an ID get one assigned under the current ID mode, counting
      // on from the highest ID already seen in this file.
      pointId: idRaw || nextPointId(points, useUniqueIds),
      latitude,
      longitude,
      direction,
      description: description === '' ? null : description,
      distanceFt,
    });
  });

  if (errors.length > 0) {
    throw new Error(`Points validation errors:\n${errors.join('\n')}`);
  }

  if (points.length === 0) {
    throw new Error('No valid points found in file');
  }

  return points;
}

/**
 * Parse a points CSV using the automatically suggested mapping. The convenience
 * path for callers that don't need to review the columns first.
 */
export function parsePointsCSV(content: string): Point[] {
  const file = inspectCSV(content);
  return buildPointsFromCSV(file, suggestMapping(file));
}

// Import data with replace or merge mode
export function importData(
  parsedData: { points?: Point[] },
  mode: 'replace' | 'merge' = 'replace'
): void {
  if (parsedData.points === undefined) return;

  if (mode === 'replace') {
    // A replace is a fresh dataset, so numbering restarts from whatever the
    // imported file uses rather than from the previous data's high-water mark.
    idCounterStorage.clear();
    saveToStorage(STORAGE_KEYS.POINTS, parsedData.points);
    parsedData.points.forEach(p => rememberId(p.pointId));
    return;
  }

  // Merge — keep what's there and append anything with a new ID.
  const existing = getFromStorage<Point[]>(STORAGE_KEYS.POINTS, []);
  const existingIds = new Set(existing.map(p => p.pointId));
  const newPoints = parsedData.points.filter(p => !existingIds.has(p.pointId));
  newPoints.forEach(p => rememberId(p.pointId));
  saveToStorage(STORAGE_KEYS.POINTS, [...existing, ...newPoints]);
}
