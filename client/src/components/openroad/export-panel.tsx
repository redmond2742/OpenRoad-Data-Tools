import FileViewer, { FilePreview } from "@/components/openroad/file-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generatePointsCSV, POINTS_FILENAME, useExport, useORStore } from "openroad";
import { AlertTriangle, CheckCircle, Download, Eye, Info } from "lucide-react";
import { useState } from "react";

export default function ExportPanel() {
  const { points } = useORStore();
  const { toast } = useToast();
  const { exportAsZip, exportAsCSV } = useExport();

  const [packageName, setPackageName] = useState(
    () => `OpenRoad_Points_${new Date().toISOString().split("T")[0]}`
  );
  const [exportFormat, setExportFormat] = useState("csv");
  const [showFilePreview, setShowFilePreview] = useState(false);

  // Duplicate IDs are the one thing that makes an exported CSV ambiguous, so
  // they are surfaced before download rather than after.
  const duplicateIds = Object.entries(
    points.reduce<Record<string, number>>((acc, p) => {
      acc[p.pointId] = (acc[p.pointId] || 0) + 1;
      return acc;
    }, {})
  ).filter(([, count]) => count > 1).map(([id]) => id);

  const previewFiles: FilePreview[] = [
    { id: "points", label: POINTS_FILENAME, content: generatePointsCSV(points) },
  ];

  const handleExport = async () => {
    try {
      if (exportFormat === "zip") {
        await exportAsZip(packageName.trim() || undefined);
        toast({ title: "Export complete", description: "ZIP package downloaded." });
      } else {
        const name = packageName.trim() ? `${packageName.trim()}.csv` : POINTS_FILENAME;
        await exportAsCSV(name);
        toast({ title: "Export complete", description: `${name} downloaded.` });
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <Card>
        <CardHeader className="bg-grey-50 border-b border-grey-200 px-4 py-3">
          <CardTitle className="text-base font-semibold text-grey-800">Data Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-grey-800">{points.length}</span>
              <span className="text-grey-500">point{points.length !== 1 ? "s" : ""}</span>
            </div>
            <span className="text-grey-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-grey-800">
                {points.filter(p => p.direction && p.direction.trim() !== "").length}
              </span>
              <span className="text-grey-500">with a direction</span>
            </div>
            <span className="text-grey-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-grey-800">
                {points.filter(p => p.description && p.description.trim() !== "").length}
              </span>
              <span className="text-grey-500">with a description</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-grey-100 space-y-1.5">
            {points.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                No points configured — the export will contain only a header row.
              </div>
            )}
            {duplicateIds.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                Duplicate ID{duplicateIds.length !== 1 ? "s" : ""}: {duplicateIds.join(", ")} — turn on
                unique IDs in Settings, or edit them so each point is distinct.
              </div>
            )}
            {points.length > 0 && duplicateIds.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle className="w-3 h-3" />
                All validations passed
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-grey-50 border-b border-grey-200">
          <CardTitle className="text-lg font-semibold text-grey-800">Export Configuration</CardTitle>
          <p className="text-sm text-grey-600">Download your points as a CSV file</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="packageName">File Name</Label>
                <Input
                  id="packageName"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="points"
                  data-testid="input-export-name"
                />
              </div>

              <div>
                <Label htmlFor="exportFormat">Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger id="exportFormat" data-testid="select-export-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV File</SelectItem>
                    <SelectItem value="zip">ZIP Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border border-grey-200 rounded-lg p-4">
              <h4 className="font-medium text-grey-800 mb-2">File Contents</h4>
              <p className="text-sm text-grey-600">
                <span className="font-mono">{POINTS_FILENAME}</span> — {points.length} record
                {points.length !== 1 ? "s" : ""}, columns{" "}
                <span className="font-mono text-xs">
                  id, latitude, longitude, direction, description, distance_ft
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-grey-200">
              <div className="flex items-center text-sm text-grey-600">
                <Info className="text-primary-500 mr-2" size={16} />
                {exportFormat === "zip"
                  ? "Export will create a ZIP containing points.csv"
                  : "Export will download a single CSV file"}
              </div>
              <Button
                onClick={handleExport}
                className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-3"
                data-testid="button-export"
              >
                <Download className="w-5 h-5 mr-3" />
                {exportFormat === "zip" ? "Download ZIP" : "Download CSV"}
              </Button>
            </div>

            <Collapsible open={showFilePreview} onOpenChange={setShowFilePreview} className="pt-4 border-t border-grey-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-grey-800">Copy CSV</h4>
                  <p className="text-xs text-grey-500">Preview and copy the file contents without downloading.</p>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="h-8 px-3 text-xs" data-testid="button-toggle-preview">
                    <Eye className="w-3 h-3 mr-1" />
                    {showFilePreview ? "Hide Preview" : "View Preview"}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-4">
                <FileViewer files={previewFiles} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
