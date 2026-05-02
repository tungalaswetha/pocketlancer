"use client";

import React from "react";
import { BadgeCheck, FileText, ShieldCheck } from "lucide-react";

export default function TermsPage() {
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
            Terms & Conditions
          </h1>

          <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            Please read these Terms carefully before using PocketLancer.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Tag icon={<FileText size={16} />} text="Terms of Use" />
            <Tag icon={<ShieldCheck size={16} />} text="Security & Fair Use" />
          </div>
        </div>

        <div className="relative border-t border-slate-200 px-6 py-8 sm:px-10 dark:border-white/10">
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <h2>1. About PocketLancer</h2>
            <p>
              PocketLancer is a platform that connects clients with freelancers
              for local services. PocketLancer does not directly provide
              services and is not responsible for service performance.
            </p>

            <h2>2. Eligibility</h2>
            <ul>
              <li>You must be at least 18 years old to use the platform.</li>
              <li>
                You must provide accurate account and profile information.
              </li>
            </ul>

            <h2>3. Accounts</h2>
            <ul>
              <li>You are responsible for your account credentials.</li>
              <li>
                You must not share your password or OTP codes with anyone.
              </li>
              <li>Suspicious activity may lead to account suspension.</li>
            </ul>

            <h2>4. Freelancer Responsibilities</h2>
            <ul>
              <li>Provide correct details (skills, pricing, service info).</li>
              <li>Respect booking commitments and client safety.</li>
              <li>Do not misrepresent identity, location, or experience.</li>
            </ul>

            <h2>5. Client Responsibilities</h2>
            <ul>
              <li>Provide correct booking details.</li>
              <li>Do not misuse the platform for fraud or harassment.</li>
              <li>Respect freelancer time and service policies.</li>
            </ul>

            <h2>6. Reviews</h2>
            <p>
              Reviews must be honest and respectful. Fake reviews, abusive
              language, or manipulation may result in removal and suspension.
            </p>

            <h2>7. Payments</h2>
            <p>
              Payment handling depends on platform configuration. PocketLancer
              may not guarantee payment protection unless explicitly stated in
              the product.
            </p>

            <h2>8. Prohibited Use</h2>
            <ul>
              <li>Illegal activities or harassment</li>
              <li>Account impersonation</li>
              <li>Malicious attacks, scraping, or reverse engineering</li>
              <li>Abuse of location features</li>
            </ul>

            <h2>9. Liability Disclaimer</h2>
            <p>
              PocketLancer is not liable for service disputes, damages, or
              losses related to freelancer services.
            </p>

            <h2>10. Updates</h2>
            <p>
              These Terms may be updated from time to time. Continued use means
              you accept the latest version.
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
