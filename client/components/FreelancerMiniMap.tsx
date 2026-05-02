"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";

type Freelancer = {
  _id: string;
  title?: string;
  city?: string;
  hourlyRate?: number;
  distanceKm?: number;
  user?: { name?: string };
  location?: { type: "Point"; coordinates: [number, number] }; // [lng,lat]
};

function createIcon(color: "red" | "blue") {
  // free marker icons CDN (stable)
  const url =
    color === "red"
      ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png"
      : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png";

  return new L.Icon({
    iconUrl: url,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const userIcon = createIcon("red");
const freelancerIcon = createIcon("blue");

function FitBounds({
  center,
  points,
}: {
  center: { latitude: number; longitude: number };
  points: { lat: number; lng: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    const all = [
      { lat: center.latitude, lng: center.longitude },
      ...points,
    ].filter(
      (p) =>
        typeof p.lat === "number" &&
        typeof p.lng === "number" &&
        !Number.isNaN(p.lat) &&
        !Number.isNaN(p.lng),
    );

    if (all.length === 1) {
      map.setView([center.latitude, center.longitude], 13);
      return;
    }

    const bounds = L.latLngBounds(all.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [center.latitude, center.longitude, points, map]);

  return null;
}

export default function FreelancerMiniMap({
  center,
  freelancers,
}: {
  center: { latitude: number; longitude: number };
  freelancers: Freelancer[];
}) {
  const points = useMemo(() => {
    return freelancers
      .map((f) => {
        const coords = f.location?.coordinates;
        if (!coords || coords.length !== 2) return null;

        const [lng, lat] = coords;
        if (typeof lat !== "number" || typeof lng !== "number") return null;
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        return { f, lat, lng };
      })
      .filter(Boolean) as { f: Freelancer; lat: number; lng: number }[];
  }, [freelancers]);

  return (
    <div className="h-full w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <p className="text-sm font-black text-slate-900 dark:text-white">
          Nearby Freelancers Map
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="text-red-500">Red</span> = You ·{" "}
          <span className="text-blue-500">Blue</span> = Freelancers
        </p>
      </div>

      <div className="h-[520px] w-full">
        <MapContainer
          center={[center.latitude, center.longitude]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds
            center={center}
            points={points.map((p) => ({ lat: p.lat, lng: p.lng }))}
          />

          {/* user */}
          <Marker
            icon={userIcon}
            position={[center.latitude, center.longitude]}
          >
            <Popup>
              <b>You are here</b>
            </Popup>
          </Marker>

          {/* freelancers */}
          {points.map(({ f, lat, lng }) => (
            <Marker key={f._id} icon={freelancerIcon} position={[lat, lng]}>
              <Popup>
                <div className="space-y-1">
                  <p className="font-extrabold">
                    {f.user?.name || "Freelancer"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {f.title || "Professional"}
                  </p>
                  <p className="text-xs">
                    ₹{f.hourlyRate ?? 0}/hr · {f.distanceKm ?? "?"} km
                  </p>
                  <p className="text-xs text-slate-500">{f.city || ""}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
