import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { nextPointId, useSettings, useORStore } from "openroad";

export default function SettingsPanel() {
  const settings = useSettings();
  const points = useORStore((state) => state.points);
  const { toast } = useToast();

  const handleToggle = (useUniqueIds: boolean) => {
    settings.save({ ...settings.data, useUniqueIds });
    toast({
      title: useUniqueIds ? "Unique IDs on" : "Sequential IDs on",
      description: useUniqueIds
        ? "New points get a random ID that won't collide with anyone else's."
        : "New points count up from the highest existing number.",
    });
  };

  // Show what the next point would actually be called under each mode.
  const nextSequential = nextPointId(points, false);
  const exampleUnique = "V1StGXR8Z5";

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Point IDs</CardTitle>
          <CardDescription>
            Every point carries an ID that goes in the first column of the exported CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-6 rounded-lg border border-grey-200 p-4">
            <div className="space-y-1">
              <Label htmlFor="unique-ids" className="text-sm font-medium text-grey-800">
                Use unique IDs
              </Label>
              <p className="text-sm text-grey-600">
                Off, IDs count up: <span className="font-mono">1, 2, 3…</span> — simple to read, but two
                people mapping different sites will both produce a point <span className="font-mono">1</span>.
                On, each point gets a random 10-character ID so datasets can be merged without collisions.
              </p>
            </div>
            <Switch
              id="unique-ids"
              checked={settings.data.useUniqueIds}
              onCheckedChange={handleToggle}
              data-testid="switch-unique-ids"
            />
          </div>

          <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-grey-500 mb-2">
              Your next point will be called
            </p>
            <p className="font-mono text-sm text-grey-800" data-testid="text-next-id-preview">
              {settings.data.useUniqueIds ? exampleUnique : nextSequential}
              {settings.data.useUniqueIds && (
                <span className="ml-2 font-sans text-xs text-grey-500">(example — each one differs)</span>
              )}
            </p>
          </div>

          <p className="text-xs text-grey-500">
            Changing this only affects points created from now on. Existing points keep the IDs they
            already have, and you can always edit an ID by hand.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
