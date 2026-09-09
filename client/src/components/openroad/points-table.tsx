import PointModal from "@/components/openroad/point-modal";
import PointsMap from "@/components/openroad/points-map";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDirection, Point, usePoints, useORStore } from "openroad";
import { ChevronDown, ChevronUp, MapPin, MousePointerClick, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SortField = "pointId" | "latitude" | "longitude" | "direction" | "distanceFt";
type SortDirection = "asc" | "desc";

interface PointsTableProps {
  triggerAdd?: number;
}

// Compare IDs so "2" sorts before "10" in sequential mode while unique IDs
// still fall back to a plain string comparison.
function naturalCompare(a: string, b: string): number {
  const aNum = Number(a);
  const bNum = Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
  return a.localeCompare(b);
}

export default function PointsTable({ triggerAdd }: PointsTableProps) {
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);
  const [newPointPosition, setNewPointPosition] = useState<{ lat: number; lng: number } | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>("pointId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  // Armed by default: the whole point of the tool is dropping pins, so the
  // first click on the map should create one.
  const [addOnClick, setAddOnClick] = useState(true);
  // Point queued for deletion, awaiting confirmation.
  const [pendingDelete, setPendingDelete] = useState<Point | null>(null);
  // Point just dropped on the map, waiting for a second click to set its
  // direction. Held by id so it always resolves to the current stored point.
  const [directionPendingId, setDirectionPendingId] = useState<string | null>(null);

  const { points, selectedPointId, setSelectedPointId } = useORStore();
  const pointHooks = usePoints();
  const { toast } = useToast();

  // The trigger prop is a counter owned by the page. Capture its value on
  // mount so a re-render never re-opens the modal on its own.
  const initialTriggerAdd = useRef(triggerAdd);
  useEffect(() => {
    if (triggerAdd !== initialTriggerAdd.current && triggerAdd && triggerAdd > 0) {
      handleAdd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAdd]);

  const handleAdd = () => {
    // Opening the form ends any direction that was mid-flow, so a later map
    // click can't land on a point the user has moved on from.
    setDirectionPendingId(null);
    setEditingPoint(null);
    setNewPointPosition(undefined);
    setShowModal(true);
  };

  const handleEdit = (point: Point) => {
    setDirectionPendingId(null);
    setEditingPoint(point);
    setNewPointPosition(undefined);
    setShowModal(true);
  };

  const handleMapAdd = (lat: number, lng: number) => {
    try {
      const saved = pointHooks.save({ latitude: lat, longitude: lng, distanceFt: 0 });
      // Hand straight over to the direction step; the next map click sets it.
      setDirectionPendingId(saved.id);
    } catch (error) {
      toast({
        title: "Could not add point",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSetDirection = (point: Point, bearing: number) => {
    pointHooks.update(point.id, { direction: String(bearing) });
    setDirectionPendingId(null);
    toast({
      title: `Point ${point.pointId} added`,
      description: `Approach direction set to ${bearing}°.`,
    });
  };

  const handleCancelDirection = () => {
    const point = points.find(p => p.id === directionPendingId);
    setDirectionPendingId(null);
    if (point) {
      toast({
        title: `Point ${point.pointId} added`,
        description: "No direction set — you can add one any time from the table.",
      });
    }
  };

  const handleMove = (id: string, lat: number, lng: number) => {
    pointHooks.update(id, { latitude: lat, longitude: lng });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    pointHooks.delete(pendingDelete.id);
    toast({ title: "Point deleted", description: `Point ${pendingDelete.pointId} removed.` });
    setPendingDelete(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const matchesSearch = (point: Point): boolean => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [point.pointId, point.description, point.direction]
      .some(v => (v || "").toLowerCase().includes(query));
  };

  const visiblePoints = points.filter(matchesSearch).sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "pointId":
        comparison = naturalCompare(a.pointId, b.pointId);
        break;
      case "latitude":
        comparison = a.latitude - b.latitude;
        break;
      case "longitude":
        comparison = a.longitude - b.longitude;
        break;
      case "direction":
        comparison = (a.direction || "").localeCompare(b.direction || "");
        break;
      case "distanceFt":
        comparison = (a.distanceFt ?? 0) - (b.distanceFt ?? 0);
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const isFiltering = searchQuery.trim() !== "";

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="text-xs font-medium text-grey-500 uppercase tracking-wider cursor-pointer hover:bg-grey-100 transition-colors py-1.5 px-2"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-between">
        {children}
        <div className="flex flex-col ml-1">
          <ChevronUp className={`w-2 h-2 ${sortField === field && sortDirection === "asc" ? "text-primary-600" : "text-grey-300"}`} />
          <ChevronDown className={`w-2 h-2 -mt-0.5 ${sortField === field && sortDirection === "desc" ? "text-primary-600" : "text-grey-300"}`} />
        </div>
      </div>
    </TableHead>
  );

  return (
    <div className="max-w-6xl h-full flex flex-col">
      {/* Vertical resizable split — drag the handle between the map and the
          list to make either pane bigger. */}
      <ResizablePanelGroup
        direction="vertical"
        autoSaveId="openroad-points-split"
        className="flex-1 min-h-[520px] rounded-lg border border-grey-200 bg-card overflow-hidden"
      >
        <ResizablePanel defaultSize={50} minSize={15} className="relative z-0">
          <div className="w-full h-full relative z-0">
            <PointsMap
              points={points}
              addOnClick={addOnClick}
              onAddPoint={handleMapAdd}
              onMovePoint={handleMove}
              onEditPoint={handleEdit}
              onDeletePoint={setPendingDelete}
              pendingDirectionPoint={points.find(p => p.id === directionPendingId) ?? null}
              onSetDirection={handleSetDirection}
              onCancelDirection={handleCancelDirection}
              highlightedPointId={selectedPointId}
              className="w-full h-full"
            />
            <div className="absolute bottom-3 left-3 z-[400]">
              <Button
                onClick={() => setAddOnClick(prev => !prev)}
                variant={addOnClick ? "default" : "outline"}
                className={cn(
                  "h-8 px-3 text-xs shadow-md",
                  !addOnClick && "bg-card hover:bg-grey-50"
                )}
                data-testid="button-toggle-add-on-click"
              >
                <MousePointerClick className="w-3.5 h-3.5 mr-1" />
                {addOnClick ? "Click to add: on" : "Click to add: off"}
              </Button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-grey-200 hover:bg-primary-300 transition-colors" />

        <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-h-0">
          <Card className="rounded-none border-0 flex flex-col h-full min-h-0">
            <CardHeader className="bg-grey-50 border-b border-grey-200 p-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-grey-700 whitespace-nowrap flex-shrink-0">
                  {isFiltering
                    ? `${visiblePoints.length} of ${points.length} point${points.length !== 1 ? "s" : ""}`
                    : `${points.length} point${points.length !== 1 ? "s" : ""}`}
                </span>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, direction or description…"
                    className="h-8 pl-8 pr-8 text-sm"
                    data-testid="input-point-search"
                  />
                  {isFiltering && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleAdd}
                  className="h-8 px-3 text-xs bg-primary-600 hover:bg-primary-700 flex items-center gap-1 flex-shrink-0"
                  data-testid="button-add-point"
                >
                  <Plus className="w-3 h-3" />
                  Add Point
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-auto min-h-0">
              {points.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center text-grey-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-grey-400" />
                    <p className="text-sm font-medium text-grey-600">No points yet</p>
                    <p className="text-xs mt-1">
                      Click anywhere on the map above to drop your first pin, or use Add Point.
                    </p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <SortableHeader field="pointId">ID</SortableHeader>
                      <SortableHeader field="latitude">Latitude</SortableHeader>
                      <SortableHeader field="longitude">Longitude</SortableHeader>
                      <SortableHeader field="direction">Direction</SortableHeader>
                      <TableHead className="text-xs font-medium text-grey-500 uppercase tracking-wider py-1.5 px-2">
                        Description
                      </TableHead>
                      <SortableHeader field="distanceFt">Distance (ft)</SortableHeader>
                      <TableHead className="w-[70px] py-1.5 px-2" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePoints.map((point) => (
                      <TableRow
                        key={point.id}
                        className={cn(
                          "cursor-pointer",
                          selectedPointId === point.id && "bg-pink-50"
                        )}
                        onMouseEnter={() => setSelectedPointId(point.id)}
                        onMouseLeave={() => setSelectedPointId(null)}
                        onClick={() => handleEdit(point)}
                        data-testid={`row-point-${point.pointId}`}
                      >
                        <TableCell className="py-1.5 px-2 text-sm font-medium text-grey-800">
                          {point.pointId}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-sm font-mono text-grey-600">
                          {point.latitude.toFixed(6)}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-sm font-mono text-grey-600">
                          {point.longitude.toFixed(6)}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-sm text-grey-600">
                          {formatDirection(point.direction) || <span className="text-grey-400">—</span>}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-sm text-grey-600 max-w-[220px] truncate">
                          {point.description || <span className="text-grey-400">—</span>}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-sm text-grey-600">
                          {point.distanceFt ?? 0}
                        </TableCell>
                        <TableCell className="py-1.5 px-2">
                          <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-grey-500 hover:text-grey-800"
                              onClick={() => handleEdit(point)}
                              aria-label={`Edit point ${point.pointId}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-grey-500 hover:text-red-700"
                              onClick={() => setPendingDelete(point)}
                              aria-label={`Delete point ${point.pointId}`}
                              data-testid={`button-row-delete-${point.pointId}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>

      <PointModal
        open={showModal}
        onOpenChange={setShowModal}
        point={editingPoint}
        defaultPosition={newPointPosition}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-point">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete point {pendingDelete?.pointId}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the point from the map and from future exports. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-point"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
