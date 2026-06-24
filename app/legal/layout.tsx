import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-brand-50/30 to-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-ink-900">
            LearnPeers
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
