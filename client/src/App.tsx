import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OpenRoadBuilder from "@/pages/openroad-builder";

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <OpenRoadBuilder />
    </TooltipProvider>
  );
}

export default App;
