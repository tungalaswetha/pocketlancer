"use client";

import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Item = {
  _id?: string;
  type: "image" | "video" | "website";
  url: string;
  title: string;
};

export default function PortfolioLightbox({
  items,
  index,
  setIndex,
  onClose,
}: {
  items: Item[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  if (!item) return null;

  const prev = () => {
    setIndex((index - 1 + items.length) % items.length);
  };

  const next = () => {
    setIndex((index + 1) % items.length);
  };

  /* Keyboard navigation */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Close */}
      <button onClick={onClose} className="absolute top-6 right-6 text-white">
        <X size={28} />
      </button>

      {/* Previous */}
      {items.length > 1 && (
        <button onClick={prev} className="absolute left-6 text-white">
          <ChevronLeft size={40} />
        </button>
      )}

      {/* Media Viewer */}
      <div className="max-h-[90vh] max-w-[90vw] flex items-center justify-center">
        {item.type === "image" && (
          <img
            src={item.url}
            alt={item.title}
            className="max-h-[90vh] max-w-[90vw] rounded-xl"
          />
        )}

        {item.type === "video" && (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] rounded-xl"
          />
        )}
      </div>

      {/* Next */}
      {items.length > 1 && (
        <button onClick={next} className="absolute right-6 text-white">
          <ChevronRight size={40} />
        </button>
      )}

      {/* Title */}
      <div className="absolute bottom-6 text-white text-sm">{item.title}</div>
    </div>
  );
}
