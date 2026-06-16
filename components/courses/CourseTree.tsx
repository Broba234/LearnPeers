"use client";

import { useState } from "react";
import { CatalogTree, CatalogCourse, CourseStatus } from "./types";

const NODE_STYLE: Record<CourseStatus, string> = {
  live: "bg-emerald-500 text-white border-emerald-500",
  verified: "bg-brand-600 text-white border-brand-600",
  pending: "bg-amber-400 text-white border-amber-400",
  claimed: "bg-slate-200 text-slate-600 border-slate-200",
  rejected: "bg-rose-100 text-rose-600 border-rose-200",
};

function Node({ course, onClick }: { course: CatalogCourse; onClick: (c: CatalogCourse) => void }) {
  const owned = course.owned;
  const code = course.code || "—";
  return (
    <button
      onClick={() => onClick(course)}
      title={course.name}
      className={`group relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
        owned
          ? NODE_STYLE[owned]
          : "border-dashed border-slate-300 text-slate-500 bg-white hover:border-brand-400 hover:text-brand-600 hover:shadow-sm"
      }`}
    >
      {owned ? (
        owned === "live" || owned === "verified" ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        )
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      )}
      {code}
    </button>
  );
}

function CategoryBlock({ node, onNodeClick }: { node: CatalogTree; onNodeClick: (c: CatalogCourse) => void }) {
  const [open, setOpen] = useState(node.ownedCount > 0);
  const hasGrades = node.courses.some((c) => c.grade != null);
  const pct = Math.round((node.ownedCount / node.total) * 100);

  // Group by grade for the ladder, else one bucket.
  const grades = hasGrades
    ? Array.from(new Set(node.courses.filter((c) => c.grade != null).map((c) => c.grade as number))).sort((a, b) => a - b)
    : [];
  const ungraded = node.courses.filter((c) => c.grade == null);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors">
        <div className="flex-1 text-left">
          <h3 className="text-sm font-semibold text-slate-900">{node.category}</h3>
          <p className="text-[11px] text-slate-400">{node.ownedCount} of {node.total} owned</p>
        </div>
        <div className="hidden sm:block w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1">
          {hasGrades ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {grades.map((g, gi) => (
                <div key={g} className="flex items-stretch gap-3">
                  <div className="min-w-[8.5rem]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Grade {g}</p>
                    <div className="flex flex-col gap-2 items-start">
                      {node.courses.filter((c) => c.grade === g).map((c) => (
                        <Node key={c.id} course={c} onClick={onNodeClick} />
                      ))}
                    </div>
                  </div>
                  {gi < grades.length - 1 && (
                    <div className="flex items-center pt-6">
                      <div className="h-px w-3 bg-slate-200" />
                      <svg className="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path d="M7 5l6 5-6 5z" /></svg>
                    </div>
                  )}
                </div>
              ))}
              {ungraded.length > 0 && (
                <div className="min-w-[8.5rem]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Other</p>
                  <div className="flex flex-col gap-2 items-start">
                    {ungraded.map((c) => <Node key={c.id} course={c} onClick={onNodeClick} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {node.courses.map((c) => <Node key={c.id} course={c} onClick={onNodeClick} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseTree({ tree, onNodeClick }: { tree: CatalogTree[]; onNodeClick: (c: CatalogCourse) => void }) {
  return (
    <div className="space-y-3">
      {tree.map((node) => (
        <CategoryBlock key={node.category} node={node} onNodeClick={onNodeClick} />
      ))}
    </div>
  );
}
