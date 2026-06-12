"use client";

import { useEffect, useState } from "react";

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
const GRADES = [9, 10, 11, 12, 1, 2, 3, 4];

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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
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

  const toggleItem = (item: SubjectItem) => {
    if (selectedSubjectSet.has(item.id)) {
      onSelectionChange(selectedItems.filter(s => s.subject_id !== item.id));
    } else {
      if (!maxSelections || selectedItems.length < maxSelections) {
        onSelectionChange([...selectedItems, {
          subject_id: item.id,
          institution_course_id: item.institution_course_id || null,
        }]);
      }
    }
  };

  const removeItem = (subjectId: string) => {
    onSelectionChange(selectedItems.filter(s => s.subject_id !== subjectId));
  };

  // Build display labels for selected chips
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
        : canonical?.grade ? `G${canonical.grade}` : null,
    };
  });

  const useInstitutionView = institutionId && institutionCourses.length > 0;

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* Selected chips */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 min-h-[48px]">
        {selectedDisplay.length === 0 ? (
          <div className="text-xs text-slate-400">No courses selected yet — choose below.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedDisplay.map(item => (
              <span
                key={item.subject_id}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-slate-50 px-3 py-1.5 text-xs font-medium"
              >
                <span className="truncate max-w-[200px]">
                  {item.label}
                  {item.sublabel && <span className="text-slate-400 ml-1">· {item.sublabel}</span>}
                </span>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-700/60 text-[10px] text-slate-200 hover:bg-red-500 transition-colors disabled:opacity-50"
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

      {/* Grade filter (only shown in canonical/fallback view) */}
      {!useInstitutionView && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${gradeFilter === null ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              onClick={() => setGradeFilter(null)}
              disabled={disabled}
            >
              All levels
            </button>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide pl-1">High School</span>
            {[9, 10, 11, 12].map(grade => (
              <button key={grade} type="button"
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${gradeFilter === grade ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                onClick={() => setGradeFilter(grade)} disabled={disabled}
              >
                Grade {grade}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide pl-1">Post-Secondary</span>
            {[1, 2, 3, 4].map(grade => (
              <button key={grade} type="button"
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${gradeFilter === grade ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                onClick={() => setGradeFilter(grade)} disabled={disabled}
              >
                Year {grade}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Institution hint */}
      {useInstitutionView && (
        <div className="text-xs text-brand-600 bg-brand-50 rounded-lg px-3 py-2">
          Showing courses from your institution — code matches will find you the most relevant tutors.
        </div>
      )}

      {/* Categories & items */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
          Loading courses...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setExpanded(expanded === cat.name ? null : cat.name)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  expanded === cat.name ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
                disabled={disabled}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {categories.map(cat =>
            expanded === cat.name && (
              <div key={cat.name + "-items"} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{cat.name}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-400 border border-slate-200">
                    {cat.items.length} available
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                  {cat.items
                    .filter(item => !useInstitutionView && gradeFilter !== null ? item.grade === gradeFilter : true)
                    .map(item => {
                      const isSelected = selectedSubjectSet.has(item.id);
                      return (
                        <button
                          key={item.institution_course_id || item.id}
                          type="button"
                          onClick={() => toggleItem(item)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
                            isSelected
                              ? "bg-brand-600 text-white border-brand-600"
                              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                          }`}
                          disabled={disabled}
                        >
                          <span className="truncate max-w-[200px]">
                            {item.institution_code
                              ? <><span className="font-mono font-semibold">{item.institution_code}</span> <span className={isSelected ? "text-brand-200" : "text-slate-400"}>· {item.name}</span></>
                              : <>{item.name}{item.code && <span className={`ml-1 ${isSelected ? "text-brand-200" : "text-slate-400"}`}>({item.code}){item.grade ? ` · ${gradeLabel(item.grade)}` : ""}</span>}</>
                            }
                          </span>
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
