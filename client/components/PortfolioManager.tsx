"use client";

import { useEffect, useState } from "react";
import PortfolioLightbox from "./PortfolioLightbox";
//import api from "@/services/api";
import {
  UploadCloud,
  Trash2,
  Loader2,
  Globe,
  Image as ImageIcon,
  Video,
  Plus,
} from "lucide-react";

type PortfolioItem = {
  _id: string;
  type: "image" | "video" | "website";
  title: string;
  description?: string;
  url: string;
};

export default function PortfolioManager() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [type, setType] = useState<"image" | "video" | "website">("image");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadPortfolio = async () => {
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

      const meRes = await fetch(`${base}/freelancers/me`, {
        credentials: "include",
      });

      if (!meRes.ok) throw new Error("Failed to fetch user");

      const meData = await meRes.json();
      const id = meData.profile._id;

      const portfolioRes = await fetch(`${base}/portfolio/${id}`, {
        credentials: "include",
      });

      if (!portfolioRes.ok) throw new Error("Failed to fetch portfolio");

      const portfolioData = await portfolioRes.json();
      setItems(portfolioData);
    } catch (err) {
      console.error(err);
      setItems([]);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const addItem = async () => {
    if (!title.trim()) return;

    if (type !== "website" && !file) {
      alert("Please select a file to upload.");
      return;
    }

    if (type === "website" && !websiteUrl.trim()) {
      alert("Please enter a website URL.");
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      alert(
        "File must be smaller than 10MB. For larger media, please upload to Google Drive or YouTube and use the 'Website' link option.",
      );
      return;
    }

    setLoading(true);

    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

      const form = new FormData();
      form.append("type", type);
      form.append("title", title);
      form.append("description", description);

      if (type === "website") {
        let url = websiteUrl.trim();

        if (!url.startsWith("http")) {
          url = "https://" + url;
        }

        form.append("websiteUrl", url);
      } else if (file) {
        form.append("file", file);
      }

      const res = await fetch(`${base}/portfolio`, {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("UPLOAD ERROR:", text);
        throw new Error("Upload failed");
      }

      await res.json();

      await loadPortfolio();

      alert("Portfolio item uploaded successfully!");

      setTitle("");
      setDescription("");
      setWebsiteUrl("");
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const deleteItem = async (id: string) => {
    const confirmDelete = confirm("Delete this portfolio item?");
    if (!confirmDelete) return;

    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

      const res = await fetch(`${base}/portfolio/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        alert("Failed to delete portfolio item");
        return;
      }

      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      console.error(err);
      alert("Error deleting portfolio item");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <header className="mb-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
          Digital Portfolio
        </h3>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          Upload visuals or add external project links.
          <br />
          <span className="text-amber-600 dark:text-amber-500 font-bold mt-1 inline-block">
            Note: Direct uploads are limited to 10MB. For larger media (like
            videos), please add a Google Drive or YouTube link using the
            "Website" option.
          </span>
        </p>
      </header>

      {/* Upload Form */}
      <div className="grid gap-4 md:grid-cols-2">
        <select
          value={type}
          onChange={(e) =>
            setType(e.target.value as "image" | "video" | "website")
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900"
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="website">Website</option>
        </select>

        <input
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-3 font-semibold focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900"
        />

        {type === "website" ? (
          <input
            placeholder="https://yourproject.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-3 font-semibold focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900"
          />
        ) : (
          <div className="md:col-span-2 flex items-center gap-4">
            <label
              htmlFor="portfolioFile"
              className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-200 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            >
              <ImageIcon size={18} />
              Choose File
            </label>

            <input
              id="portfolioFile"
              key={type}
              type="file"
              accept={type === "image" ? "image/*" : "video/*"}
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);

                if (selected) {
                  const url = URL.createObjectURL(selected);
                  setPreview(url);
                }
              }}
              className="hidden"
            />
            {preview && (
              <div className="md:col-span-2 rounded-2xl overflow-hidden border border-slate-200">
                {type === "image" && (
                  <img
                    src={preview}
                    alt="preview"
                    className="w-full h-56 object-cover"
                  />
                )}

                {type === "video" && (
                  <video
                    src={preview}
                    controls
                    className="w-full h-56 object-cover"
                  />
                )}
              </div>
            )}

            {file && (
              <span className="text-sm text-green-600 truncate max-w-[200px]">
                Selected: {file.name}
              </span>
            )}
          </div>
        )}

        <button
          onClick={!loading ? addItem : undefined}
          disabled={loading}
          className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud size={18} />
              Add Portfolio Item
            </>
          )}
        </button>
      </div>

      {/* Grid */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item._id}
            className="group overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-black/5 transition hover:shadow-lg dark:bg-slate-900 dark:ring-white/10"
          >
            <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {item.type === "image" && (
                <div
                  onClick={() =>
                    setLightboxIndex(items.findIndex((i) => i._id === item._id))
                  }
                  className="h-full w-full cursor-pointer"
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
              )}

              {item.type === "video" && (
                <div
                  onClick={() =>
                    setLightboxIndex(items.findIndex((i) => i._id === item._id))
                  }
                  className="h-full w-full cursor-pointer"
                >
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {item.type === "website" && (
                <a
                  href={
                    item.url.startsWith("http")
                      ? item.url
                      : `https://${item.url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 text-blue-600 font-bold"
                >
                  <Globe size={28} />
                  Visit Website
                </a>
              )}
            </div>

            <div className="p-5">
              <h4 className="font-black text-slate-900 dark:text-white">
                {item.title}
              </h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {item.description}
              </p>

              <button
                onClick={() => deleteItem(item._id)}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          No portfolio items yet. Upload your first project.
        </p>
      )}
      {lightboxIndex !== null && (
        <PortfolioLightbox
          items={items}
          index={lightboxIndex}
          setIndex={(i) => setLightboxIndex(i)}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
