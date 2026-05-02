import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm dark:bg-white dark:text-slate-900">
              P
            </div>
            <div className="leading-tight">
              <p className="font-black text-slate-900 dark:text-white text-sm">
                PocketLancer
              </p>
              <p className="text-[10px] font-bold text-slate-500">
                Hire trusted freelancers
              </p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Link
              href="/terms"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Privacy
            </Link>
            <Link
              href="/freelancer/availability"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              For Freelancers
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} PocketLancer
          </p>
        </div>
      </div>
    </footer>
  );
}
