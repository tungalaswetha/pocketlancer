"use client";

export default function GetLocationButton() {
  const getLocation = async () => {
    try {
      // ✅ Web version (browser / Vercel)
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log("WEB LAT:", pos.coords.latitude);
            console.log("WEB LNG:", pos.coords.longitude);
          },
          (err) => {
            console.error("Browser location error:", err);
            alert("Location permission denied");
          },
        );

        return;
      }

      // ✅ Mobile Capacitor version
      // dynamic import prevents Vercel build crash
      const { Geolocation } = await import("@capacitor/geolocation");

      const perm = await Geolocation.requestPermissions();

      if (perm.location === "granted") {
        const position = await Geolocation.getCurrentPosition();

        console.log("APP LAT:", position.coords.latitude);
        console.log("APP LNG:", position.coords.longitude);
      }
    } catch (e) {
      console.error("Location error:", e);
    }
  };

  return (
    <button
      onClick={getLocation}
      className="rounded-xl bg-slate-900 px-4 py-2 font-black text-white"
    >
      Get My Location
    </button>
  );
}
