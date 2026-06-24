import Link from "next/link";

interface DocLike {
  title: string;
  version: number;
  effective_date: Date | null;
  content: string;
}

const proseClasses =
  "legal-prose text-[15px] leading-relaxed text-ink-700 [&_a]:text-brand-600 [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink-900 [&_li]:mb-1.5 [&_p]:mb-4 [&_.legal-meta]:text-ink-500 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 first:[&_h2]:mt-0";

/** Server-rendered view of a published legal document (owner-authored HTML). */
export default function LegalDocView({ doc, otherHref, otherLabel }: { doc: DocLike | null; otherHref: string; otherLabel: string }) {
  if (!doc) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center text-ink-500">
        This document hasn’t been published yet.
      </div>
    );
  }

  const effective = doc.effective_date
    ? new Date(doc.effective_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <article className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:p-10">
      <header className="mb-8 border-b border-ink-100 pb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-ink-400">
          Version {doc.version}
          {effective ? ` · Effective ${effective}` : ""}
        </p>
      </header>
      <div className={proseClasses} dangerouslySetInnerHTML={{ __html: doc.content }} />
      <footer className="mt-10 border-t border-ink-100 pt-6 text-sm text-ink-500">
        See also our{" "}
        <Link href={otherHref} className="font-medium text-brand-600 hover:text-brand-700">
          {otherLabel}
        </Link>
        .
      </footer>
    </article>
  );
}
