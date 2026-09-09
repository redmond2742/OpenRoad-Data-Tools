import DirectionInput from "@/components/openroad/direction-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Point, usePoints } from "openroad";
import { useEffect, useState } from "react";

interface PointModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create a new point at `defaultPosition`. */
  point: Point | null;
  defaultPosition?: { lat: number; lng: number };
}

type FormState = {
  pointId: string;
  latitude: string;
  longitude: string;
  direction: string | null;
  description: string;
  distanceFt: string;
};

const emptyForm: FormState = {
  pointId: "",
  latitude: "",
  longitude: "",
  direction: null,
  description: "",
  distanceFt: "0",
};

export default function PointModal({ open, onOpenChange, point, defaultPosition }: PointModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const { toast } = useToast();
  const points = usePoints();

  useEffect(() => {
    if (!open) return;
    if (point) {
      setForm({
        pointId: point.pointId,
        latitude: String(point.latitude),
        longitude: String(point.longitude),
        direction: point.direction,
        description: point.description ?? "",
        distanceFt: String(point.distanceFt ?? 0),
      });
    } else {
      setForm({
        ...emptyForm,
        latitude: defaultPosition ? String(defaultPosition.lat) : "",
        longitude: defaultPosition ? String(defaultPosition.lng) : "",
      });
    }
  }, [open, point, defaultPosition]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      toast({ title: "Invalid latitude", description: "Latitude must be between -90 and 90.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast({ title: "Invalid longitude", description: "Longitude must be between -180 and 180.", variant: "destructive" });
      return;
    }

    // Distance is optional; a blank field means 0, as does a missing column.
    const distanceRaw = form.distanceFt.trim();
    const distanceFt = distanceRaw === "" ? 0 : Number(distanceRaw);
    if (!Number.isFinite(distanceFt) || distanceFt < 0) {
      toast({ title: "Invalid distance", description: "Distance must be 0 or greater.", variant: "destructive" });
      return;
    }

    const description = form.description.trim() === "" ? null : form.description.trim();

    try {
      if (point) {
        points.update(point.id, {
          pointId: form.pointId.trim() || point.pointId,
          latitude,
          longitude,
          direction: form.direction,
          description,
          distanceFt,
        });
        toast({ title: "Point updated", description: `Point ${form.pointId || point.pointId} saved.` });
      } else {
        const saved = points.save({
          pointId: form.pointId.trim() || undefined,
          latitude,
          longitude,
          direction: form.direction,
          description,
          distanceFt,
        });
        toast({ title: "Point added", description: `Point ${saved.pointId} created.` });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Could not save point",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{point ? `Edit point ${point.pointId}` : "Add point"}</DialogTitle>
          <DialogDescription>
            Latitude and longitude are required. Direction, description and distance are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pointId">ID</Label>
            <Input
              id="pointId"
              value={form.pointId}
              onChange={(e) => set("pointId", e.target.value)}
              placeholder={point ? "" : "Assigned automatically"}
              className="mt-1"
              data-testid="input-point-id"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                placeholder="37.7749"
                className="mt-1 font-mono"
                data-testid="input-point-latitude"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                placeholder="-122.4194"
                className="mt-1 font-mono"
                data-testid="input-point-longitude"
              />
            </div>
          </div>

          <div>
            <Label>Compass direction</Label>
            <DirectionInput
              value={form.direction}
              onChange={(next) => set("direction", next)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional note about this location"
              className="mt-1 min-h-[64px]"
              data-testid="input-point-description"
            />
          </div>

          <div>
            <Label htmlFor="distanceFt">Distance (ft)</Label>
            <Input
              id="distanceFt"
              type="number"
              min={0}
              value={form.distanceFt}
              onChange={(e) => set("distanceFt", e.target.value)}
              className="mt-1"
              data-testid="input-point-distance"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="button-save-point">
              {point ? "Save changes" : "Add point"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
