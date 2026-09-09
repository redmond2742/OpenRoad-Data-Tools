import ExportPanel from "@/components/openroad/export-panel";
import { ImportPanel } from "@/components/openroad/import-panel";
import PointsTable from "@/components/openroad/points-table";
import SettingsPanel from "@/components/openroad/settings-panel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { clearAllData, cn, useORStore, useLoadFromStorage } from "openroad";
import { Coffee, FolderInput, FolderOutput, HelpCircle, MapPin, Menu, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useState } from "react";

const REPO_URL = "https://github.com/redmond2742/OpenRoad-Data-Tools";

type ViewType = "points" | "settings" | "import" | "export";

const views = [
  { id: "points", label: "Points", icon: MapPin },
  { id: "settings", label: "Settings", icon: SlidersHorizontal },
] as const;

const viewTitles: Record<ViewType, { title: string; desc: string }> = {
  points: { title: "Points", desc: "Drop pins anywhere on the map and record what matters about each one" },
  settings: { title: "Settings", desc: "Choose how new point IDs are assigned" },
  import: { title: "Import Data", desc: "Load points from a CSV file or pasted text" },
  export: { title: "Export Data", desc: "Download your points as a CSV file" },
};

export default function OpenRoadBuilder() {
  const [activeView, setActiveView] = useState<ViewType>("points");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [triggerAdd, setTriggerAdd] = useState(0);
  const { points, setPoints, loadFromStorage } = useORStore();
  const { toast } = useToast();

  // Load data from localStorage on mount
  useLoadFromStorage();

  const handleClearAllData = () => {
    clearAllData();
    setPoints([]);
    toast({
      title: "Data Cleared",
      description: "All points have been deleted.",
    });
  };

  const renderView = () => {
    switch (activeView) {
      case "export":
        return <ExportPanel />;
      case "import":
        return <ImportPanel onImportComplete={loadFromStorage} />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <PointsTable triggerAdd={triggerAdd} />;
    }
  };

  const navButton = (
    id: ViewType,
    label: string,
    Icon: typeof MapPin,
    { count }: { count?: number } = {}
  ) => {
    const isActive = activeView === id;
    return (
      <button
        key={id}
        onClick={() => {
          setActiveView(id);
          setIsMobileMenuOpen(false);
        }}
        className={cn(
          "w-full flex items-center space-x-2 px-2 py-2 rounded-md text-left transition-all duration-200",
          isActive
            ? "bg-primary-100 text-primary-700 border border-primary-200 shadow-sm"
            : "text-grey-600 hover:bg-grey-100 hover:text-grey-800"
        )}
        data-testid={`button-nav-${id}`}
      >
        <Icon size={16} className={isActive ? "text-primary-600" : "text-grey-500"} />
        <div className="flex-1">
          <span className="text-xs font-medium">{label}</span>
        </div>
        {count !== undefined && count > 0 && (
          <Badge variant={isActive ? "default" : "secondary"} className="text-xs px-1.5 py-0 min-w-[18px] h-4">
            {count}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <div className="h-screen flex bg-grey-50">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-56 bg-grey-100 shadow-lg border-r border-grey-200 flex flex-col h-full transition-transform duration-300 z-50",
        "fixed lg:static inset-y-0 left-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex-shrink-0 p-3 border-b border-grey-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <MapPin className="text-white" size={16} />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-bold text-grey-800 leading-tight">OpenRoad</h1>
              <p className="text-[10px] text-grey-500 leading-tight">Data Tools</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-grey-400 hover:text-grey-600">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">About OpenRoad Data Tools</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm text-grey-700">
                  <p>
                    <strong>OpenRoad Data Tools</strong> lets you drop pins at any location and record what
                    matters about each one — an ID, coordinates, the direction traffic approaches from, a
                    description, and a distance — then export the whole set as a simple CSV.
                  </p>
                  <p>
                    Each point becomes one row of{" "}
                    <span className="font-mono text-xs">
                      id, latitude, longitude, direction, description, distance_ft
                    </span>
                    . Direction can be a general heading (NB, SB, EB, WB) or an exact compass bearing, and it
                    is drawn on the map as an arrow arriving at the point.
                  </p>
                  <p>
                    All data is stored locally in your browser using localStorage. Nothing is sent to a
                    server. Your work persists between sessions on the same browser.
                  </p>
                  <p>
                    OpenRoad Data Tools is <strong>open source and free to use</strong>. The full source is on{" "}
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      GitHub
                    </a>
                    {" "}&mdash; you're welcome to fork it and adapt it for your own work.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto min-h-0">
          <div className="space-y-1">
            {views.map((view) =>
              navButton(view.id, view.label, view.icon, view.id === "points" ? { count: points.length } : {})
            )}
          </div>
        </nav>

        {/* Footer Actions - Always visible at bottom */}
        <div className="flex-shrink-0 p-2 border-t border-grey-200">
          {/* Support this Tool section */}
          <div className="mb-4 pb-3 border-b border-grey-200">
            <p className="text-xs font-medium text-grey-600 mb-2 px-2">Support this Tool</p>
            <Button
              size="sm"
              className="w-full h-7 text-xs bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => window.open('https://buymeacoffee.com/mr2742', '_blank')}
            >
              <Coffee className="w-3 h-3 mr-1" />
              Buy me a Coffee
            </Button>
          </div>

          {/* Import/Export section */}
          <div className="mb-4 pb-3 border-b border-grey-200">
            <p className="text-xs font-medium text-grey-600 mb-2 px-2">Data Management</p>
            <div className="space-y-1">
              <Button
                variant="outline"
                className={cn(
                  "w-full h-7 text-xs",
                  activeView === "import"
                    ? "bg-primary-100 text-primary-700 border-primary-200"
                    : "bg-grey-100 text-grey-700 hover:bg-grey-200"
                )}
                onClick={() => {
                  setActiveView("import");
                  setIsMobileMenuOpen(false);
                }}
                data-testid="button-import"
              >
                <FolderInput className="w-3 h-3 mr-1" />
                Import
              </Button>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-7 text-xs",
                  activeView === "export"
                    ? "bg-primary-100 text-primary-700 border-primary-200"
                    : "bg-grey-100 text-grey-700 hover:bg-grey-200"
                )}
                onClick={() => {
                  setActiveView("export");
                  setIsMobileMenuOpen(false);
                }}
                data-testid="button-export"
              >
                <FolderOutput className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Clear All Data */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-7 text-xs mt-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                data-testid="button-clear-all"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {points.length} point{points.length !== 1 ? "s" : ""}.
                  This action cannot be undone — export a CSV first if you want a copy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllData}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-confirm-clear"
                >
                  Clear All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-grey-100 border-b border-grey-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden h-8 w-8 p-0"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
              <div>
                <h2 className="text-base lg:text-lg font-bold text-grey-800">
                  {viewTitles[activeView].title}
                </h2>
                <p className="text-xs text-grey-500 hidden sm:block">
                  {viewTitles[activeView].desc}
                </p>
              </div>
            </div>
            {activeView === "points" && (
              <Button
                onClick={() => setTriggerAdd(prev => prev + 1)}
                className="h-7 px-2 text-xs bg-primary-600 hover:bg-primary-700 flex items-center gap-1"
                data-testid="button-header-add-point"
              >
                <Plus className="w-3 h-3" />
                <span>Add Point</span>
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-3">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
