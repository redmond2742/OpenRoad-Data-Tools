import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ColumnMapper from '@/components/openroad/column-mapper';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  buildPointsFromCSV,
  ColumnMapping,
  csvHeaders,
  CsvFile,
  importData,
  inspectCSV,
  mappingIssues,
  Point,
  POINT_FIELDS,
  suggestMapping,
} from 'openroad';
import JSZip from 'jszip';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, ClipboardPaste, FileText, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';

// A file that parsed into rows, together with the mapping the user is editing.
type LoadedFile = {
  name: string;
  csv: CsvFile;
  mapping: ColumnMapping;
};

type ValidationError = {
  file: string;
  message: string;
};

// Text files the importer will read out of an upload or a zip.
const TEXT_EXTENSIONS = ['.csv', '.txt'];

const isTextFile = (name: string) => TEXT_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

export function ImportPanel({ onImportComplete }: { onImportComplete?: () => void }) {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [readErrors, setReadErrors] = useState<ValidationError[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pasteContent, setPasteContent] = useState<string>("");
  const [openMapper, setOpenMapper] = useState<string | null>(null);
  const { toast } = useToast();

  // Points are rebuilt from the current mapping on every edit, so the preview,
  // the error list and the import button all reflect what you're looking at.
  const built = useMemo(
    () =>
      files.map(file => {
        try {
          return { name: file.name, points: buildPointsFromCSV(file.csv, file.mapping), error: null };
        } catch (error) {
          return {
            name: file.name,
            points: [] as Point[],
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          };
        }
      }),
    [files]
  );

  const allPoints = built.flatMap(b => b.points);
  const buildErrors: ValidationError[] = built
    .filter(b => b.error)
    .map(b => ({ file: b.name, message: b.error as string }));
  const validationErrors = [...readErrors, ...buildErrors];

  const loadContents = (contents: { name: string; content: string }[], errors: ValidationError[]) => {
    const loaded: LoadedFile[] = [];
    contents.forEach(({ name, content }) => {
      try {
        const csv = inspectCSV(content);
        loaded.push({ name, csv, mapping: suggestMapping(csv) });
      } catch (error) {
        errors.push({
          file: name,
          message: error instanceof Error ? error.message : 'Could not read file.',
        });
      }
    });

    setFiles(loaded);
    setReadErrors(errors);
    // Open the mapper straight away when a file needs attention — a required
    // field went unmatched, or columns were left over.
    const needsAttention = loaded.find(f => {
      const unassigned = csvHeaders(f.csv).some(
        (_, column) => !POINT_FIELDS.some(field => f.mapping.fields[field.field].includes(column))
      );
      return unassigned || mappingIssues(f.mapping).length > 0;
    });
    setOpenMapper(needsAttention ? needsAttention.name : loaded[0]?.name ?? null);
  };

  const handleFileChange = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const contents: { name: string; content: string }[] = [];
    const errors: ValidationError[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const lower = file.name.toLowerCase();

      if (lower.endsWith('.zip')) {
        // Extract every text entry from the archive and treat each one as if
        // it had been uploaded individually.
        try {
          const zip = await JSZip.loadAsync(await file.arrayBuffer());
          let extracted = 0;
          for (const path of Object.keys(zip.files)) {
            const entry = zip.files[path];
            if (entry.dir) continue;
            if (!isTextFile(path)) continue;
            const content = await entry.async('string');
            const base = path.split('/').pop() || path;
            contents.push({ name: base, content });
            extracted++;
          }
          if (extracted === 0) {
            errors.push({ file: file.name, message: 'Zip contained no .csv or .txt files.' });
          }
        } catch (err) {
          errors.push({
            file: file.name,
            message: err instanceof Error ? `Could not read zip: ${err.message}` : 'Could not read zip file.',
          });
        }
      } else if (isTextFile(lower)) {
        contents.push({ name: file.name, content: await file.text() });
      } else {
        errors.push({ file: file.name, message: 'Unsupported file type — upload .csv, .txt or .zip.' });
      }
    }

    loadContents(contents, errors);
  };

  const updateFile = (name: string, changes: Partial<LoadedFile>) => {
    setFiles(prev => prev.map(f => (f.name === name ? { ...f, ...changes } : f)));
  };

  const handleImport = () => {
    try {
      importData({ points: allPoints }, importMode);

      toast({
        title: "Import successful",
        description: `Imported ${allPoints.length} point${allPoints.length !== 1 ? 's' : ''}`,
      });

      clearAll();
      setShowConfirmDialog(false);

      // Notify parent to refresh data
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const handlePasteData = () => {
    if (!pasteContent.trim()) return;
    loadContents([{ name: 'pasted_points.csv', content: pasteContent }], []);
  };

  const clearAll = () => {
    setFiles([]);
    setReadErrors([]);
    setPasteContent("");
    setOpenMapper(null);
  };

  const hasData = allPoints.length > 0;
  const hasErrors = validationErrors.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Points</CardTitle>
        <CardDescription>
          Upload a CSV (or a ZIP of CSVs) to load points. Files exported from this tool import as-is.
          Any other spreadsheet works too — matching columns are detected automatically, and you can
          open <strong>Columns</strong> to reassign, ignore or combine the rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4" />
              Paste Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-grey-300'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              data-testid="import-dropzone"
            >
              <Upload className="mx-auto h-12 w-12 text-grey-400 mb-3" />
              <div className="space-y-2">
                <p className="text-sm text-grey-600">
                  Drag and drop <span className="font-medium">.csv</span> or <span className="font-medium">.zip</span> files here, or click to browse
                </p>
                <input
                  type="file"
                  multiple
                  accept=".csv,.txt,.zip,text/csv,application/zip,application/x-zip-compressed"
                  onChange={(e) => handleFileChange(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  data-testid="input-file-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  data-testid="button-browse-files"
                >
                  Browse Files
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-4 space-y-4">
            <div>
              <Label>Paste CSV Contents</Label>
              <Textarea
                placeholder={"id,latitude,longitude,direction,description,distance_ft\n1,37.7749,-122.4194,NB,Stop bar,150"}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                className="mt-1 min-h-[200px] font-mono text-sm"
                data-testid="input-paste-content"
              />
            </div>

            <Button
              onClick={handlePasteData}
              disabled={!pasteContent.trim()}
              className="w-full"
              data-testid="button-parse-paste"
            >
              Parse Pasted Data
            </Button>
          </TabsContent>
        </Tabs>

        {/* Per-file column mapping */}
        {files.map((file) => {
          const result = built.find(b => b.name === file.name);
          const isOpen = openMapper === file.name;
          return (
            <Collapsible
              key={file.name}
              open={isOpen}
              onOpenChange={(open) => setOpenMapper(open ? file.name : null)}
              className="rounded-lg border border-grey-200"
            >
              <div className="flex items-center gap-2 p-3">
                <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium" data-testid={`file-item-${file.name}`}>
                  {file.name}
                </span>
                {result?.error ? (
                  <span className="text-xs text-red-700">needs attention</span>
                ) : (
                  <span className="text-xs text-grey-500">
                    {result?.points.length ?? 0} point{(result?.points.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="h-7 px-2 text-xs" data-testid={`button-columns-${file.name}`}>
                    {isOpen ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                    Columns
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="border-t border-grey-200 p-3">
                <ColumnMapper
                  csv={file.csv}
                  mapping={file.mapping}
                  idPrefix={file.name}
                  onMappingChange={(mapping) => updateFile(file.name, { mapping })}
                  onHasHeaderRowChange={(hasHeaderRow) => {
                    // Whether row 1 is data changes what the columns are called,
                    // so the suggestion is recomputed from the new headers.
                    const csv = { ...file.csv, hasHeaderRow };
                    updateFile(file.name, { csv, mapping: suggestMapping(csv) });
                  }}
                />
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* Import Mode Selector */}
        {hasData && (
          <div>
            <Label>Import Mode</Label>
            <RadioGroup value={importMode} onValueChange={(value) => setImportMode(value as 'replace' | 'merge')} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" data-testid="radio-replace" />
                <Label htmlFor="replace" className="font-normal cursor-pointer">
                  <span className="font-semibold">Overwrite existing</span> — clear current points, then import what's in the file(s)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merge" id="merge" data-testid="radio-merge" />
                <Label htmlFor="merge" className="font-normal cursor-pointer">
                  <span className="font-semibold">Append to existing</span> — keep current points and add new ones (skips duplicate IDs)
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Validation Errors */}
        {hasErrors && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Validation Errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm whitespace-pre-wrap" data-testid={`error-${index}`}>
                    <strong>{error.file}:</strong> {error.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Preview */}
        {hasData && !hasErrors && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="font-semibold mb-2">Ready to Import:</div>
              <ul className="space-y-1 text-sm">
                <li data-testid="preview-points">
                  ✓ {allPoints.length} Point{allPoints.length !== 1 ? 's' : ''}
                  {files.length > 1 ? ` from ${files.length} files` : ''}
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Button */}
        {hasData && !hasErrors && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={clearAll} data-testid="button-cancel-import">
              Cancel
            </Button>
            <Button onClick={() => setShowConfirmDialog(true)} data-testid="button-import-data">
              Import Data
            </Button>
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent data-testid="dialog-import-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Import</AlertDialogTitle>
              <AlertDialogDescription>
                {importMode === 'replace' ? (
                  <>
                    <strong className="text-destructive">Warning:</strong> This will replace all existing points with the imported points.
                    This action cannot be undone.
                  </>
                ) : (
                  <>
                    This will merge the imported points with your existing points. Duplicate IDs will be skipped.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleImport} data-testid="button-confirm-import">
                {importMode === 'replace' ? 'Replace All Points' : 'Merge Points'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
