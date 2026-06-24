"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check, GraduationCap, BookOpen } from "lucide-react";

export type SubjectItem = {
  id: string;
  name: string;
  code?: string | null;
  grade?: number | null;
  category?: string | null;
  // institution course fields (set when user has an institution)
  institution_course_id?: string | null;
  institution_code?: string | null;
  institution_name?: string | null;
};

type CanonicalSubject = {
  id: string;
  name: string;
  code?: string | null;
  grade?: number | null;
  category?: string | null;
};

type InstitutionCourse = {
  id: string;
  code: string;
  name: string | null;
  subject_id: string;
  Institutions: { id: string; name: string; abbreviation: string | null };
  Subjects: { id: string; name: string; category: string | null };
};

type CategoryGroup = {
  name: string;
  items: SubjectItem[];
};

interface SubjectSelectorProps {
  selectedSubjectIds: Array<string | SubjectItem>;
  onSelectionChange: (items: Array<{ subject_id: string; institution_course_id?: string | null }>) => void;
  maxSelections?: number;
  disabled?: boolean;
  institutionId?: string | null;
}

const gradeLabel = (n: number) => (n >= 1 && n <= 4 ? `Year ${n}` : `Grade ${n}`);

export default function SubjectSelector({
  selectedSubjectIds,
  onSelectionChange,
  maxSelections,
  disabled,
  institutionId,
}: SubjectSelectorProps) {
  const [canonicalSubjects, setCanonicalSubjects] = useState<CanonicalSubject[]>([]);
  const [institutionCourses, setInstitutionCourses] = useState<InstitutionCourse[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const requests: Promise<any>[] = [
      fetch("/api/subjects").then(r => r.json()),
    ];
    if (institutionId) {
      requests.push(fetch(`/api/institution-courses?institution_id=${institutionId}`).then(r => r.json()));
    }
    Promise.all(requests).then(([subjectsData, coursesData]) => {
      const subjects: CanonicalSubject[] = Array.isArray(subjectsData) ? subjectsData : [];
      const courses: InstitutionCourse[] = Array.isArray(coursesData) ? coursesData : [];
      setCanonicalSubjects(subjects);
      setInstitutionCourses(courses);

      // Build display items — prefer institution course entries, fall back to canonical
      const items: SubjectItem[] = institutionId && courses.length > 0
        ? courses.map(c => ({
            id: c.Subjects.id,
            name: c.Subjects.name,
            category: c.Subjects.category,
            institution_course_id: c.id,
            institution_code: c.code,
            institution_name: c.Institutions.abbreviation || c.Institutions.name,
          }))
        : subjects.map(s => ({
            id: s.id,
            name: s.name,
            code: s.code,
            grade: s.grade,
            category: s.category,
          }));

      const catMap = new Map<string, SubjectItem[]>();
      items.forEach(item => {
        const cat = item.category || "Uncategorized";
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(item);
      });
      setCategories(Array.from(catMap.entries()).map(([name, items]) => ({ name, items })));
      setError(null);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load subjects");
      setLoading(false);
    });
  }, [institutionId]);

  // Normalize selection to { subject_id, institution_course_id? }
  const selectedItems: Array<{ subject_id: string; institution_course_id?: string | null }> =
    (selectedSubjectIds ?? []).map(item => {
      if (typeof item === "string") return { subject_id: item };
      const s = item as SubjectItem;
      return { subject_id: s.id, institution_course_id: s.institution_course_id };
    }).filter(s => s.subject_id?.length > 0);

  const selectedSubjectSet = new Set(selectedItems.map(s => s.subject_id));
  const useInstitutionView = !!institutionId && institutionCourses.length > 0;
  const atLimit = maxSelections ? selectedItems.length >= maxSelections : false;

  const toggleItem = (item: SubjectItem) => {
    if (selectedSubjectSet.has(item.id)) {
      onSelectionChange(selectedItems.filter(s => s.subject_id !== item.id));
    } else if (!atLimit) {
      onSelectionChange([...selectedItems, {
        subject_id: item.id,
        institution_course_id: item.institution_course_id || null,
      }]);
    }
  };

  const removeItem = (subjectId: string) => {
    onSelectionChange(selectedItems.filter(s => s.subject_id !== subjectId));
  };

  // Build display labels for the selected chips
  const selectedDisplay = selectedItems.map(sel => {
    const instCourse = institutionCourses.find(c => c.id === sel.institution_course_id);
    const canonical = canonicalSubjects.find(s => s.id === sel.subject_id);
    return {
      subject_id: sel.subject_id,
      label: instCourse
        ? `${instCourse.code} · ${instCourse.Subjects.name}`
        : canonical?.name || sel.subject_id,
      sublabel: instCourse
        ? instCourse.Institutions.abbreviation || instCourse.Institutions.name
        : canonical?.grade ? gradeLabel(canonical.grade) : null,
    };
  });

  // Apply search + grade filter, drop empty categories.
  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map(cat => ({
        name: cat.name,
        items: cat.items.filter(item => {
          if (!useInstitutionView && gradeFilter !== null && item.grade !== gradeFilter) return false;
          if (!q) return true;
          const hay = `${item.name} ${item.code ?? ""} ${item.institution_code ?? ""}`.toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter(cat => cat.items.length > 0);
  }, [categories, query, gradeFilter, useInstitutionView]);

  const totalMatches = filteredCategories.reduce((n, c) => n + c.items.length, 0);
  const max = maxSelections ?? 0;

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* Selected summary */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Your courses</span>
          {max > 0 && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                atLimit ? "bg-brand-600 text-white" : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {selectedItems.length} / {max}
            </span>
          )}
        </div>
        {selectedDisplay.length === 0 ? (
          <p className="text-xs text-slate-400">
            None yet — search or browse below and tap a course to add it.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedDisplay.map(item => (
              <span
                key={item.subject_id}
                className="group inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
              >
                <span className="truncate max-w-[220px]">
                  {item.label}
                  {item.sublabel && <span className="text-brand-200 ml-1">· {item.sublabel}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.label}`}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[11px] leading-none text-white transition-colors hover:bg-white/40 disabled:opacity-50"
                  onClick={() => removeItem(item.subject_id)}
                  disabled={disabled}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder={useInstitutionView ? "Search by course code or name…" : "Search courses…"}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* Level filter (canonical view only) */}
      {!useInstitutionView && (
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill active={gradeFilter === null} onClick={() => setGradeFilter(null)} disabled={disabled}>
            All levels
          </FilterPill>
          <span className="mx-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            <BookOpen className="h-3 w-3" /> HS
          </span>
          {[9, 10, 11, 12].map(grade => (
            <FilterPill key={grade} active={gradeFilter === grade} onClick={() => setGradeFilter(grade)} disabled={disabled}>
              G{grade}
            </FilterPill>
          ))}
          <span className="mx-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            <GraduationCap className="h-3.5 w-3.5" /> Uni
          </span>
          {[1, 2, 3, 4].map(grade => (
            <FilterPill key={grade} active={gradeFilter === grade} onClick={() => setGradeFilter(grade)} disabled={disabled}>
              Y{grade}
            </FilterPill>
          ))}
        </div>
      )}

      {/* Institution hint */}
      {useInstitutionView && (
        <div className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
          Showing courses from your institution — matching by exact course code finds you the most relevant tutors.
        </div>
      )}

      {/* At-limit notice */}
      {atLimit && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          You've reached {max} courses. Remove one to add another.
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              <div className="flex flex-wrap gap-2">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : totalMatches === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">No courses match “{query}”.</p>
          <p className="mt-1 text-xs text-slate-400">Try a different code, name, or clear the filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map(cat => (
            <div key={cat.name}>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cat.name}</h3>
                <span className="text-[11px] text-slate-300">{cat.items.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.items.map(item => {
                  const isSelected = selectedSubjectSet.has(item.id);
                  const isDisabled = disabled || (!isSelected && atLimit);
                  return (
                    <button
                      key={item.institution_course_id || item.id}
                      type="button"
                      onClick={() => toggleItem(item)}
                      disabled={isDisabled}
                      className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                        isSelected
                          ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                          : isDisabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                          : "border-slate-200 bg-white text-slate-800 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      <span className="flex h-3.5 w-3.5 items-center justify-center">
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <span className={`h-3 w-3 rounded-full border ${isDisabled ? "border-slate-200" : "border-slate-300 group-hover:border-brand-400"}`} />
                        )}
                      </span>
                      <span className="truncate max-w-[220px]">
                        {item.institution_code ? (
                          <>
                            <span className="font-mono font-semibold">{item.institution_code}</span>{" "}
                            <span className={isSelected ? "text-brand-200" : "text-slate-400"}>· {item.name}</span>
                          </>
                        ) : (
                          <>
                            {item.name}
                            {item.code && (
                              <span className={`ml-1 ${isSelected ? "text-brand-200" : "text-slate-400"}`}>({item.code})</span>
                            )}
                            {item.grade ? (
                              <span className={`ml-1 ${isSelected ? "text-brand-200" : "text-slate-400"}`}>· {gradeLabel(item.grade)}</span>
                            ) : null}
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
