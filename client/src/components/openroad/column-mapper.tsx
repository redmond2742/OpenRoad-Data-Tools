import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ColumnMapping,
  csvDataRows,
  csvHeaders,
  CsvFile,
  mappedValue,
  PointField,
  POINT_FIELDS,
} from "openroad";

const IGNORE = "ignore";

/** Which field a source column currently feeds, if any. */
function assignmentFor(mapping: ColumnMapping, column: number): PointField | typeof IGNORE {
  const found = POINT_FIELDS.find(f => mapping.fields[f.field].includes(column));
  return found ? found.field : IGNORE;
}

/**
 * Point a column at a field. A column only ever feeds one field, so it is
 * cleared from everywhere first. Combinable fields collect columns in file
 * order; the rest hold a single column and simply take the newest, which is
 * what "this column is the latitude" should mean.
 */
function assign(
  mapping: ColumnMapping,
  column: number,
  next: PointField | typeof IGNORE
): ColumnMapping {
  const fields = { ...mapping.fields };
  (Object.keys(fields) as PointField[]).forEach(field => {
    fields[field] = fields[field].filter(c => c !== column);
  });

  if (next !== IGNORE) {
    const meta = POINT_FIELDS.find(f => f.field === next)!;
    fields[next] = meta.combinable
      ? [...fields[next], column].sort((a, b) => a - b)
      : [column];
  }

  return { ...mapping, fields };
}

interface ColumnMapperProps {
  csv: CsvFile;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onHasHeaderRowChange: (hasHeaderRow: boolean) => void;
  idPrefix: string;
}

/**
 * Lets the user say what each column in an uploaded file means: assign it to a
 * field, leave it out, or send several columns into one combinable field.
 */
export default function ColumnMapper({
  csv,
  mapping,
  onMappingChange,
  onHasHeaderRowChange,
  idPrefix,
}: ColumnMapperProps) {
  const headers = csvHeaders(csv);
  const dataRows = csvDataRows(csv);
  const sampleRow = dataRows[0];

  // A separator only matters for a field that is actually joining columns.
  const combiningFields = POINT_FIELDS.filter(
    f => f.combinable && mapping.fields[f.field].length > 1
  );

  const previewRows = dataRows.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idPrefix}-header`}
          checked={csv.hasHeaderRow}
          onCheckedChange={(checked) => onHasHeaderRowChange(checked === true)}
          data-testid={`checkbox-header-row-${idPrefix}`}
        />
        <Label htmlFor={`${idPrefix}-header`} className="text-sm font-normal cursor-pointer">
          First row is a header
        </Label>
      </div>

      <div className="rounded-md border border-grey-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium text-grey-500 uppercase tracking-wider py-1.5 px-2">
                Column in file
              </TableHead>
              <TableHead className="text-xs font-medium text-grey-500 uppercase tracking-wider py-1.5 px-2">
                First value
              </TableHead>
              <TableHead className="text-xs font-medium text-grey-500 uppercase tracking-wider py-1.5 px-2 w-[180px]">
                Import as
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header, column) => {
              const assigned = assignmentFor(mapping, column);
              const sample = sampleRow?.[column]?.trim() ?? "";
              return (
                <TableRow key={column} data-testid={`row-column-${column}`}>
                  <TableCell className="py-1.5 px-2 text-sm font-medium text-grey-800">
                    {header}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-sm font-mono text-grey-600 max-w-[220px] truncate">
                    {sample || <span className="font-sans text-grey-400">empty</span>}
                  </TableCell>
                  <TableCell className="py-1.5 px-2">
                    <Select
                      value={assigned}
                      onValueChange={(value) =>
                        onMappingChange(assign(mapping, column, value as PointField | typeof IGNORE))
                      }
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid={`select-column-${column}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IGNORE}>Ignore</SelectItem>
                        {POINT_FIELDS.map(({ field, label, required }) => (
                          <SelectItem key={field} value={field}>
                            {label}
                            {required ? " *" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-grey-500">
        * required. Pick <strong>Ignore</strong> for columns you don't need, or send two or more
        columns to <strong>ID</strong> or <strong>Description</strong> to join them into one value.
      </p>

      {combiningFields.map(({ field, label }) => (
        <div key={field} className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-sep-${field}`} className="text-sm whitespace-nowrap">
            Join {label} columns with
          </Label>
          <Input
            id={`${idPrefix}-sep-${field}`}
            value={mapping.separators[field]}
            onChange={(e) =>
              onMappingChange({
                ...mapping,
                separators: { ...mapping.separators, [field]: e.target.value },
              })
            }
            className="h-8 w-28 text-sm font-mono"
            data-testid={`input-separator-${field}`}
          />
        </div>
      ))}

      {previewRows.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-grey-500 mb-1.5">
            Preview — first {previewRows.length} row{previewRows.length !== 1 ? "s" : ""} as imported
          </p>
          <div className="rounded-md border border-grey-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {POINT_FIELDS.map(({ field, label }) => (
                    <TableHead
                      key={field}
                      className="text-xs font-medium text-grey-500 uppercase tracking-wider py-1.5 px-2 whitespace-nowrap"
                    >
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, i) => (
                  <TableRow key={i} data-testid={`row-preview-${i}`}>
                    {POINT_FIELDS.map(({ field }) => {
                      const value = mappedValue(row, mapping, field);
                      return (
                        <TableCell
                          key={field}
                          className="py-1.5 px-2 text-sm text-grey-700 whitespace-nowrap max-w-[200px] truncate"
                        >
                          {value || <span className="text-grey-400">—</span>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
