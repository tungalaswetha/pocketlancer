"use client";

import React from "react";
import { BadgeCheck, ShieldCheck, Lock, MapPin } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10 py-10">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-44 -left-44 h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative px-6 py-10 sm:px-10">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
            <BadgeCheck size={16} className="text-blue-500" />
            PocketLancer Legal
          </p>

          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            We respect your privacy and keep your data safe.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Tag icon={<Lock size={16} />} text="Secure Sessions (JWT)" />
            <Tag
              icon={<ShieldCheck size={16} />}
              text="Minimal Data Collection"
            />
            <Tag
              icon={<MapPin size={16} />}
              text="Location Used Only for Search"
            />
          </div>
        </div>

        <div className="relative border-t border-slate-200 px-6 py-8 sm:px-10 dark:border-white/10">
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <h2>1. What data we collect</h2>
            <ul>
              <li>Account data: name, email, role</li>
              <li>Profile data: title, bio, skills, hourly rate</li>
              <li>Booking data: booking status, service type, date/time</li>
              <li>Review data: rating and comments</li>
              <li>
                Location data: only when you enable GPS, used for nearby search
              </li>
            </ul>

            <h2>2. How we use your data</h2>
            <ul>
              <li>To match clients with nearby freelancers</li>
              <li>To run bookings & status updates</li>
              <li>To protect platform integrity and prevent abuse</li>
              <li>To display reviews and trust indicators</li>
            </ul>

            <h2>3. Location usage</h2>
            <p>
              Location is required to activate freelancer profiles. We store
              freelancer location as GeoJSON in MongoDB. Client location is used
              only for searching nearby professionals.
            </p>

            <h2>4. Cookies</h2>
            <p>
              PocketLancer uses secure cookies for authentication (JWT stored as
              HttpOnly cookie). This helps protect sessions.
            </p>

            <h2>5. Data sharing</h2>
            <p>
              We do not sell your personal data. Data may be shared only when
              required for platform operation (example: showing freelancer name
              to client during booking).
            </p>

            <h2>6. Security</h2>
            <p>
              We implement access control, protected routes, and secure session
              handling. However, no system is 100% secure.
            </p>

            <h2>7. Your rights</h2>
            <ul>
              <li>You can update your profile anytime.</li>
              <li>You can request account deletion.</li>
              <li>You can withdraw location access anytime.</li>
            </ul>

            <h2>8. Updates</h2>
            <p>
              This Privacy Policy may be updated. Continued use means you accept
              updates.
            </p>

            <p className="text-sm text-slate-500">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-black/5 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10">
      <span className="text-slate-500 dark:text-slate-300">{icon}</span>
      {text}
    </span>
  );
}
