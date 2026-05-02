"use client";

import dynamic from "next/dynamic";

// We import the map component dynamically and disable Server-Side Rendering (SSR)
// This ensures the map only loads once the code reaches the browser.
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-slate-50">
      <p className="text-slate-500 animate-pulse">Initializing map engine...</p>
    </div>
  ),
});

export default function MapSearchPage() {
  return <MapComponent />;
}
