"use client";
import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    const forceLight = () => {
      document.documentElement.classList.remove("dark");
    };

    // Run immediately
    forceLight();

    // Watch for anything trying to add .dark back (MutationObserver)
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains("dark")) {
        forceLight();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
