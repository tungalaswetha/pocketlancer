"use client";

import { useState } from "react";
import Modal from "react-modal";

Modal.setAppElement("body");

export default function PortfolioGallery({
  portfolio,
}: {
  portfolio: string[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!portfolio?.length) return null;

  const getPreview = (url: string) => {
    // if image link
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return url;

    // fallback preview
    return `https://image.thum.io/get/width/600/${url}`;
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Portfolio</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {portfolio.map((item, i) => (
          <div
            key={i}
            onClick={() => setSelected(item)}
            className="cursor-pointer overflow-hidden rounded-lg border hover:shadow-md transition"
          >
            <img
              src={getPreview(item)}
              alt="portfolio"
              className="h-40 w-full object-cover"
            />

            <div className="p-3 text-sm text-blue-600 truncate">{item}</div>
          </div>
        ))}
      </div>

      {/* MODAL PREVIEW */}
      <Modal
        isOpen={!!selected}
        onRequestClose={() => setSelected(null)}
        className="max-w-3xl mx-auto mt-20 bg-white rounded-lg p-6 shadow-lg outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-start justify-center"
      >
        {selected && (
          <div>
            <img
              src={getPreview(selected)}
              className="w-full rounded-lg"
              alt="preview"
            />

            <a
              href={selected}
              target="_blank"
              className="block mt-4 text-blue-600 font-semibold"
            >
              Open Project →
            </a>

            <button
              onClick={() => setSelected(null)}
              className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
