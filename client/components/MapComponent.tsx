"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import api from "@/services/api";
import { getCurrentLocation } from "@/utils/geolocation";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet + Next.js issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapSearchPage() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const { latitude, longitude } = await getCurrentLocation();
        setCenter([latitude, longitude]);

        const res = await api.get("/freelancers/search", {
          params: {
            latitude,
            longitude,
            radiusKm: 10,
          },
        });

        setFreelancers(res.data.freelancers);
      } catch {
        setError("Unable to load map. Please allow location access.");
      }
    };

    loadMapData();
  }, []);

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  if (!center) {
    return <div className="p-6 text-center">Loading map…</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location */}
        <Marker position={center}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Freelancer markers */}
        {freelancers.map((f) => (
          <Marker
            key={f._id}
            position={[f.location.coordinates[1], f.location.coordinates[0]]}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{f.user?.name}</p>
                <p className="text-sm">₹{f.hourlyRate}/hr</p>
                <p className="text-xs text-slate-500">{f.distanceKm} km away</p>
                <Link
                  href={`/freelancer/${f._id}`}
                  className="text-sm text-blue-600 underline"
                >
                  View profile
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
