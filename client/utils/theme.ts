export type AppTheme = "light" | "dark";

const STORAGE_KEY = "pocketlancer-theme";

export function getTheme(): AppTheme {
  if (typeof window === "undefined") return "light";

  const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
  if (saved === "light" || saved === "dark") return saved;

  // fallback only if user never selected manually
  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)",
  ).matches;
  return prefersDark ? "dark" : "light";
}

export function setTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, theme);

  const html = document.documentElement;
  if (theme === "dark") html.classList.add("dark");
  else html.classList.remove("dark");
}
