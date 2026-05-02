// client/utils/geolocation.ts

/** True when running inside a Capacitor native app (Android/iOS) */
function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!(cap?.isNativePlatform?.() || cap?.Plugins?.Geolocation);
}

/**
 * Normalises any Capacitor/browser GeolocationPositionError into a typed
 * error with a predictable prefix. Capacitor throws a PositionError object
 * with a numeric `code` (1=PERMISSION_DENIED 2=POSITION_UNAVAILABLE 3=TIMEOUT)
 * but the `.message` string varies wildly by Android version and vendor —
 * so we always key off the code, never the string.
 */
function normalisePositionError(err: any): Error {
  const code: number | undefined = err?.code;

  if (code === 1)
    return new Error(
      "PERMISSION_DENIED: Location permission denied. Please enable it in Settings → App → Permissions.",
    );
  if (code === 2)
    return new Error(
      "POSITION_UNAVAILABLE: Location unavailable. Please ensure GPS and Location Services are enabled on your device.",
    );
  if (code === 3)
    return new Error(
      "TIMEOUT: GPS timed out — please step outside or into open air and try again.",
    );

  // Re-throw anything that is already one of our own typed errors
  if (err instanceof Error) return err;

  return new Error(String(err?.message ?? err ?? "Unknown location error"));
}

/**
 * Extracts lat/lng from a Capacitor GeolocationPosition, throwing a typed
 * error if coords are undefined — happens on some Android devices where
 * getCurrentPosition resolves successfully but with a malformed object.
 */
function extractCoords(pos: any): { latitude: number; longitude: number } {
  const lat = pos?.coords?.latitude;
  const lng = pos?.coords?.longitude;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    isNaN(lat) ||
    isNaN(lng)
  ) {
    throw new Error(
      "POSITION_UNAVAILABLE: GPS returned an invalid position — please try again.",
    );
  }
  return { latitude: lat, longitude: lng };
}

/**
 * Get GPS coordinates — uses Capacitor on Android/iOS, browser API on web.
 *
 * Strategy: try a fast coarse (network/cell-tower) fix first.
 * This responds in <2 s and is accurate enough for a 10 km radius search.
 * High-accuracy GPS is only used as a fallback because a cold Android GPS
 * takes 20–60 s and reliably times out indoors.
 */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");

    const perm = await Geolocation.requestPermissions();

    // "prompt" means Android will show the dialog on the next call — not a denial.
    if (perm.location === "denied") {
      throw new Error(
        "PERMISSION_DENIED: Location permission denied. Please enable it in Settings → App → Permissions.",
      );
    }

    // ── Step 1: fast coarse fix (cell tower / WiFi, usually <2 s) ──
    try {
      const coarse = await Promise.race([
        Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        }).catch((e) => {
          throw normalisePositionError(e);
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("TIMEOUT: Coarse location timed out.")),
            10000,
          ),
        ),
      ]);
      return extractCoords(coarse);
    } catch (err: any) {
      // ✅ FIX: Re-throw PERMISSION_DENIED immediately — no point trying
      // high-accuracy GPS if the user has denied location access entirely.
      if (err?.message?.startsWith("PERMISSION_DENIED")) throw err;
      // All other errors (TIMEOUT, POSITION_UNAVAILABLE) fall through to
      // the high-accuracy GPS attempt below.
    }

    // ── Step 2: high-accuracy GPS fallback ──────────────────────────
    try {
      const precise = await Promise.race([
        Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 25000,
          maximumAge: 0,
        }).catch((e) => {
          throw normalisePositionError(e);
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "TIMEOUT: GPS timed out — please step outside or try again.",
                ),
              ),
            28000,
          ),
        ),
      ]);
      return extractCoords(precise);
    } catch (err: any) {
      // Re-normalise in case the inner .catch() didn't run (e.g. our own setTimeout)
      throw normalisePositionError(err);
    }
  }

  // ── Web / browser fallback ────────────────────────────────────────
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(
        new Error(
          "POSITION_UNAVAILABLE: Geolocation is not supported by this browser.",
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          resolve(extractCoords(pos));
        } catch (e: any) {
          reject(e);
        }
      },
      (err) => reject(normalisePositionError(err)),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/** Reverse geocode coordinates to city/country using OpenStreetMap Nominatim. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ city: string; country: string }> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
    { headers: { "Accept-Language": "en" } },
  );
  if (!res.ok) throw new Error("Reverse geocode failed");
  const data = await res.json();
  return {
    city:
      data.address?.city || data.address?.town || data.address?.village || "",
    country: data.address?.country || "",
  };
}

/**
 * Haversine distance in kilometres between two coordinates.
 * Used to verify freelancer arrival proximity.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
