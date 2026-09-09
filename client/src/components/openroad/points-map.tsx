import MapTileLayers from "@/components/ui/map-tile-layers";
import { Button } from "@/components/ui/button";
import { bearingBetween, directionToDegrees, formatDirection, Point, useORStore } from "openroad";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MousePointerClick, Navigation, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LINE_COLOR = "#2563eb";
const HIGHLIGHT_COLOR = "#ec4899";

/**
 * Marker for a point: a dot on the exact coordinate, growing a pointed nose in
 * the direction of travel when the point has one.
 *
 * The nose and the dot are drawn as two overlapping shapes rather than one
 * path — each is painted twice, once fat and white as a casing and once in
 * colour on top, so they merge into a single silhouette with a white halo and
 * no seam where they meet.
 *
 * Keeping the arrow on the icon rather than drawing it as a map polyline means
 * it stays the same size at every zoom instead of growing with the map, so a
 * dense set of points stays readable. The stored direction is the heading of
 * travel and SVG rotation is clockwise from up, so the bearing applies
 * directly: 0 points north, 90 east.
 */
const MARKER_SIZE = 46;
const MARKER_CENTER = 23;
const NOSE = "M23 3 L30.5 21 L15.5 21 Z";

function markerSvg(degrees: number | null, color: string): string {
  const dot = (fill: string, casing: boolean) =>
    `<circle cx="23" cy="23" r="7" fill="${fill}"${casing ? ' stroke="white" stroke-width="4"' : ""}/>`;
  const nose = (fill: string, casing: boolean) =>
    `<path d="${NOSE}" fill="${fill}"${casing ? ' stroke="white" stroke-width="4" stroke-linejoin="round"' : ""}/>`;

  const body =
    degrees === null
      ? dot("white", true) + dot(color, false)
      : `<g transform="rotate(${degrees} ${MARKER_CENTER} ${MARKER_CENTER})">` +
        nose("white", true) +
        dot("white", true) +
        nose(color, false) +
        dot(color, false) +
        `</g>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_SIZE}" height="${MARKER_SIZE}" ` +
    `viewBox="0 0 ${MARKER_SIZE} ${MARKER_SIZE}" ` +
    `style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35))">` +
    body +
    `</svg>`
  );
}

// Icons are cached and depend only on the bearing, never on hover state.
// Handing react-leaflet a different icon makes it call setIcon, which replaces
// the marker's DOM element — and an element replaced under the cursor swallows
// the click in progress, so hover must never change the icon. Highlighting is
// drawn as a separate halo instead. At most 361 entries.
const iconCache = new Map<string, L.DivIcon>();

function pointIcon(direction: string | null): L.DivIcon {
  const degrees = directionToDegrees(direction);
  const key = String(degrees ?? "none");
  const cached = iconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    className: "openroad-point-marker",
    html: markerSvg(degrees, LINE_COLOR),
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_CENTER, MARKER_CENTER],
    popupAnchor: [0, -14],
  });
  iconCache.set(key, icon);
  return icon;
}

/**
 * Map clicks, in two phases.
 *
 * With nothing pending, a click drops a new point. That point then becomes
 * `pendingPoint`, and the NEXT click doesn't create anything — it says where
 * traffic comes from, and the bearing from there back to the pin becomes the
 * point's direction. Moving the cursor in that state reports its position so a
 * preview line can be drawn.
 */
function MapClicks({
  enabled,
  pendingPoint,
  onAdd,
  onSetDirection,
  onCursorMove,
}: {
  enabled: boolean;
  pendingPoint: Point | null;
  onAdd: (lat: number, lng: number) => void;
  onSetDirection: (lat: number, lng: number) => void;
  onCursorMove: (position: [number, number] | null) => void;
}) {
  useMapEvents({
    click(e) {
      if (pendingPoint) {
        onSetDirection(e.latlng.lat, e.latlng.lng);
        return;
      }
      if (!enabled) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e) {
      if (!pendingPoint) return;
      onCursorMove([e.latlng.lat, e.latlng.lng]);
    },
    mouseout() {
      onCursorMove(null);
    },
  });
  return null;
}

// Fit the view to the points the first time they appear. Keyed on the count
// only, so editing or dragging a point doesn't yank the view back.
function MapBounds({ points }: { points: Point[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 16);
      return;
    }

    const group = new L.FeatureGroup(
      points.map(p => L.marker([p.latitude, p.longitude]))
    );
    map.fitBounds(group.getBounds(), { padding: [30, 30] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length, map]);

  return null;
}

interface PointsMapProps {
  points: Point[];
  /** Armed state of click-to-drop, owned by the parent so it can show a toggle. */
  addOnClick: boolean;
  onAddPoint: (lat: number, lng: number) => void;
  onMovePoint: (id: string, lat: number, lng: number) => void;
  onEditPoint: (point: Point) => void;
  onDeletePoint: (point: Point) => void;
  /** Point awaiting a second click to set its direction, if any. */
  pendingDirectionPoint?: Point | null;
  onSetDirection: (point: Point, bearing: number) => void;
  onCancelDirection: () => void;
  highlightedPointId?: string | null;
  className?: string;
}

export default function PointsMap({
  points,
  addOnClick,
  onAddPoint,
  onMovePoint,
  onEditPoint,
  onDeletePoint,
  pendingDirectionPoint = null,
  onSetDirection,
  onCancelDirection,
  highlightedPointId,
  className,
}: PointsMapProps) {
  const setSelectedPointId = useORStore((state) => state.setSelectedPointId);
  // Cursor position while a direction is being set, for the preview line.
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  // Escape backs out of setting a direction, leaving the point without one.
  useEffect(() => {
    if (!pendingDirectionPoint) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelDirection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDirectionPoint, onCancelDirection]);

  // Drop the stale cursor as soon as the pending point changes or clears, so a
  // preview line never lingers from the previous point.
  useEffect(() => {
    setCursor(null);
  }, [pendingDirectionPoint?.id]);

  const handleSetDirection = (lat: number, lng: number) => {
    if (!pendingDirectionPoint) return;
    // The click says where traffic comes FROM; the heading it travels is the
    // bearing from there to the pin.
    const bearing = bearingBetween(
      lat,
      lng,
      pendingDirectionPoint.latitude,
      pendingDirectionPoint.longitude
    );
    onSetDirection(pendingDirectionPoint, Math.round(bearing));
  };

  // Where to open the map before any points exist. Centering on the whole US
  // at low zoom is the least surprising blank state.
  const center: [number, number] = useMemo(() => {
    if (points.length > 0) return [points[0].latitude, points[0].longitude];
    return [39.8283, -98.5795];
  }, [points]);

  return (
    <div className={className} style={{ position: "relative", zIndex: 1 }}>
      <MapContainer
        center={center}
        zoom={points.length > 0 ? 15 : 4}
        scrollWheelZoom
        style={{
          height: "100%",
          width: "100%",
          zIndex: 1,
          cursor: pendingDirectionPoint || addOnClick ? "crosshair" : "",
        }}
        className="rounded-lg"
      >
        <MapTileLayers />
        <MapBounds points={points} />
        <MapClicks
          enabled={addOnClick}
          pendingPoint={pendingDirectionPoint}
          onAdd={onAddPoint}
          onSetDirection={handleSetDirection}
          onCursorMove={setCursor}
        />

        {/* Preview of the direction being set: a dashed line from the cursor to
            the pin, showing the heading the second click would record. */}
        {pendingDirectionPoint && cursor && (
          <Polyline
            positions={[cursor, [pendingDirectionPoint.latitude, pendingDirectionPoint.longitude]]}
            color={LINE_COLOR}
            weight={3}
            opacity={0.7}
            dashArray="6 6"
          />
        )}

        {points.map((point) => {
          const highlighted = highlightedPointId === point.id;
          return (
            <Fragment key={point.id}>
              {/* Hover halo, drawn behind the marker and non-interactive so it
                  never intercepts a click meant for the point itself. */}
              {highlighted && (
                <CircleMarker
                  center={[point.latitude, point.longitude]}
                  radius={16}
                  interactive={false}
                  pathOptions={{
                    color: HIGHLIGHT_COLOR,
                    fillColor: HIGHLIGHT_COLOR,
                    fillOpacity: 0.3,
                    weight: 3,
                  }}
                />
              )}
              <Marker
                position={[point.latitude, point.longitude]}
                icon={pointIcon(point.direction)}
                zIndexOffset={highlighted ? 1000 : 0}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = (e.target as L.Marker).getLatLng();
                    onMovePoint(point.id, lat, lng);
                  },
                  mouseover: () => setSelectedPointId(point.id),
                  mouseout: () => setSelectedPointId(null),
                }}
              >
                <Popup minWidth={220}>
                  <div className="p-0.5 w-[210px] space-y-1.5">
                    <h3 className="text-sm font-semibold text-grey-800">Point {point.pointId}</h3>
                    <dl className="text-xs text-grey-600 space-y-0.5">
                      <div className="flex justify-between gap-2">
                        <dt className="text-grey-500">Location</dt>
                        <dd className="font-mono">
                          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-grey-500">Direction</dt>
                        <dd>{formatDirection(point.direction) || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-grey-500">Distance</dt>
                        <dd>{point.distanceFt ?? 0} ft</dd>
                      </div>
                    </dl>
                    {point.description && (
                      <p className="text-xs text-grey-700 border-t border-grey-200 pt-1.5">
                        {point.description}
                      </p>
                    )}
                    <div className="flex gap-1 pt-0.5">
                      <Button
                        onClick={() => onEditPoint(point)}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 flex-1"
                        data-testid={`button-edit-point-${point.pointId}`}
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => onDeletePoint(point)}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2 border-red-200 text-red-700 hover:bg-red-50"
                        aria-label={`Delete point ${point.pointId}`}
                        data-testid={`button-delete-point-${point.pointId}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>

      {pendingDirectionPoint ? (
        <div className="absolute inset-x-0 top-3 z-[400] flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-primary-600 px-3 py-1.5 text-xs text-white shadow-md">
            <Navigation className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Point {pendingDirectionPoint.pointId} placed — now click where traffic comes from
            </span>
            <button
              onClick={onCancelDirection}
              className="ml-1 rounded-full bg-white/20 px-2 py-0.5 font-medium hover:bg-white/30"
              data-testid="button-skip-direction"
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        addOnClick && points.length === 0 && (
          <div className="absolute inset-x-0 top-3 z-[400] flex justify-center pointer-events-none">
            <div className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs text-grey-700 shadow-md border border-grey-200">
              <MousePointerClick className="w-3.5 h-3.5 text-primary-600" />
              Click anywhere on the map to drop your first point
            </div>
          </div>
        )
      )}
    </div>
  );
}
