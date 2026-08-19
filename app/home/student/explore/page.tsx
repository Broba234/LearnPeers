"use client";
import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase/client";
import { TutorProfileModalContext } from "@/components/ui/components/common/TutorProfileModalContext";
import { FilterModal } from "@/components/FilterModal";
import { toast } from "sonner";
import {
  SlidersHorizontal,
  X,
  BookOpen,
  GraduationCap,
  Users,
  Search,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { CategoryGroup, SortKey, StudentSubject, Subjects, Tutor } from "./types";
import { SORT_LABELS, filterAndSortTutors } from "./utils";
import { AvailableNowRail } from "./components/AvailableNowRail";
import { TutorSection } from "./components/TutorSection";

export default function ExploreTutors() {
  const [studentSubjectIds, setStudentSubjectIds] = useState<string[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [studentInstitutionId, setStudentInstitutionId] = useState<string | null>(null);
  const [scope, setScope] = useState<'mine' | 'equivalent'>('equivalent');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subjects[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [onlyActiveNow, setOnlyActiveNow] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const { openTutorProfileModal, openConnectNow } = useContext(TutorProfileModalContext)!;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntent = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");
    const sessionId = params.get("sessionId");
    if (!paymentIntent || !redirectStatus) return;

    window.history.replaceState({}, "", window.location.pathname);

    if (redirectStatus === "succeeded" && sessionId) {
      fetch("/api/sessions/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // paymentIntentId is REQUIRED by the (hardened) confirm-payment route —
        // it re-verifies the PI succeeded for this session. After a 3D-Secure
        // redirect Stripe returns it as ?payment_intent=… ; forward it or the
        // confirm 400s and a paid session never flips to "accepted".
        body: JSON.stringify({ sessionId, paymentIntentId: paymentIntent }),
      })
        .then((res) => {
          if (res.ok) toast.success("Payment successful! Your session has been booked.");
          else console.warn("Could not confirm session after 3DS redirect");
        })
        .catch(() => console.error("Failed to confirm payment after redirect"));
    } else if (redirectStatus === "failed") {
      toast.error("Payment was not completed. Please try booking again.");
    }
  }, []);

  useEffect(() => {
    const fetchTutors = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/profiles/available-tutors${onlyActiveNow ? "?availableNow=true" : ""}`);
        if (!res.ok) { setTutors([]); setLoading(false); return; }
        const data = await res.json();
        const tutorList = Array.isArray(data) ? data : Array.isArray(data?.tutors) ? data.tutors : [];
        setTutors(tutorList);
      } catch {
        setTutors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTutors();
  }, [onlyActiveNow]);

  // Saved tutors (favorites)
  useEffect(() => {
    fetch("/api/saved-tutors")
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((d) => setSavedIds(new Set(d.ids || [])))
      .catch(() => {});
  }, []);

  const toggleSave = async (tutorId: string) => {
    setSavedIds((prev) => {
      const n = new Set(prev);
      n.has(tutorId) ? n.delete(tutorId) : n.add(tutorId);
      return n;
    });
    try {
      const res = await fetch("/api/saved-tutors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId }),
      });
      if (res.ok) {
        const d = await res.json();
        setSavedIds((prev) => {
          const n = new Set(prev);
          d.saved ? n.add(tutorId) : n.delete(tutorId);
          return n;
        });
      }
    } catch {
      /* a later fetch reconciles */
    }
  };

  // Deep link from a shared tutor profile (/tutor/[id] → "Book a session"):
  // auto-open that tutor's booking once the list has loaded. A pick made while
  // logged out survives the signup/login hop via localStorage, so check that
  // too — the guest lands here with their tutor already open.
  useEffect(() => {
    if (loading || tutors.length === 0) return;
    let tid = new URLSearchParams(window.location.search).get("tutor");
    if (!tid) {
      try {
        const raw = localStorage.getItem("lp_pending_tutor");
        if (raw) tid = JSON.parse(raw)?.id ?? null;
      } catch {
        /* ignore malformed storage */
      }
    }
    if (!tid) return;
    try {
      localStorage.removeItem("lp_pending_tutor");
    } catch {
      /* ignore */
    }
    const t = tutors.find((x) => x.id === tid);
    if (t) {
      openTutorProfileModal(t);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loading, tutors, openTutorProfileModal]);

  useEffect(() => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    fetch("/api/subjects")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSubjects(data);
          const catMap = new Map<string, Subjects[]>();
          data.forEach((subject: Subjects) => {
            const cat = subject.category || "Uncategorized";
            if (!catMap.has(cat)) catMap.set(cat, []);
            catMap.get(cat)!.push(subject);
          });
          setCategories(Array.from(catMap.entries()).map(([name, subjects]) => ({ name, subjects })));
        } else {
          setSubjects([]);
          setCategories([]);
          setSubjectsError("Invalid data format from server");
        }
        setSubjectsLoading(false);
      })
      .catch(() => {
        setSubjectsError("Failed to load subjects");
        setSubjects([]);
        setCategories([]);
        setSubjectsLoading(false);
      });
  }, []);

  useEffect(() => {
    const fetchStudentSubjects = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!user || error || !user.email) return;
        const res = await fetch(`/api/profiles/get-full?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const profile = await res.json();
          setStudentInstitutionId(profile?.institution_id || null);
          const normalizedSubjects: StudentSubject[] = Array.isArray(profile?.subjects)
            ? profile.subjects
                .map((s: any) => {
                  const subject_id = s?.id || s?.subject_id;
                  if (!subject_id) return null;
                  return {
                    subject_id,
                    institution_course_id: s?.institution_course_id || null,
                    name: s?.name || null,
                    code: s?.institution_course?.code || s?.code || null,
                  };
                })
                .filter((s: any): s is StudentSubject => !!s?.subject_id)
            : [];
          setStudentSubjects(normalizedSubjects);
          setStudentSubjectIds(normalizedSubjects.map(s => s.subject_id));
        } else {
          setStudentSubjectIds([]);
          setStudentSubjects([]);
        }
      } catch {
        setStudentSubjectIds([]);
        setStudentSubjects([]);
      }
    };
    fetchStudentSubjects();
  }, []);

  const toggleSubject = (id: string) => {
    if (typeof id !== "string" || id.length === 0) return;
    if (validStudentSubjectIds.includes(id)) {
      setStudentSubjectIds(validStudentSubjectIds.filter((sid) => sid !== id));
    } else if (validStudentSubjectIds.length < 5) {
      setStudentSubjectIds([...validStudentSubjectIds, id]);
    }
  };

  const removeSubject = (id: string) => {
    if (typeof id === "string" && id.length > 0) {
      setStudentSubjectIds(validStudentSubjectIds.filter((sid) => sid !== id));
    }
  };

  const validStudentSubjectIds = (studentSubjectIds ?? []).filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );

  const selectedSubjects: Subjects[] = subjects.filter(
    (subj) => typeof subj.id === "string" && subj.id.length > 0 && validStudentSubjectIds.includes(subj.id)
  );

  const getSubjectTutors = (subjectId: string) => {
    const studentSubject = studentSubjects.find(s => s.subject_id === subjectId);
    return tutors.filter(tutor => {
      if (!Array.isArray(tutor.subjects)) return false;
      return tutor.subjects.some((ts: any) => {
        if (scope === 'mine' && studentSubject?.institution_course_id) {
          return ts.institution_course_id === studentSubject.institution_course_id;
        }
        return ts.id === subjectId || ts.Subjects?.id === subjectId;
      });
    });
  };

  const allTutorsForSelectedSubjects =
    validStudentSubjectIds.length > 0
      ? tutors.filter((tutor) => {
          if (!Array.isArray(tutor.subjects)) return false;
          return tutor.subjects.some((ts: any) => {
            const tutorSubjectId = ts.id || ts.Subjects?.id;
            if (!tutorSubjectId) return false;
            if (scope === 'mine') {
              const matching = studentSubjects.find(s => s.subject_id === tutorSubjectId);
              if (matching?.institution_course_id) {
                return ts.institution_course_id === matching.institution_course_id;
              }
            }
            return validStudentSubjectIds.includes(tutorSubjectId);
          });
        })
      : [];

  const activeFilterCount = validStudentSubjectIds.length + (gradeFilter ? 1 : 0) + (onlyActiveNow ? 1 : 0);
  const activeNowTutors = tutors.filter((t) => t.derivedActiveNow);
  const displayedTutors = filterAndSortTutors(tutors, query, sortBy);
  // Live count for the filter modal CTA — matches what the page will render
  // (grade only narrows the subject list; Active Now already refetched `tutors`).
  const matchingTutorCount =
    validStudentSubjectIds.length > 0
      ? filterAndSortTutors(allTutorsForSelectedSubjects, query, sortBy).length
      : displayedTutors.length;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-5xl mx-auto py-8 lg:pt-16 px-4 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">Find a Tutor</h1>
            <button
              onClick={() => setFilterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Search + sort */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by course code (e.g. MCV4U), subject, school, or name"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-52"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    Sort: {SORT_LABELS[k]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Institution scope toggle — only shown when student has institution + has subject filters */}
          {studentInstitutionId && validStudentSubjectIds.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setScope('mine')}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${scope === 'mine' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                Only at my institution
              </button>
              <button
                onClick={() => setScope('equivalent')}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${scope === 'equivalent' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                Include equivalent courses
              </button>
              {scope === 'equivalent' && (
                <span className="text-xs text-slate-400">across all institutions</span>
              )}
            </div>
          )}

          {/* Active filter chips */}
          {(selectedSubjects.length > 0 || gradeFilter || onlyActiveNow) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {onlyActiveNow && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Active Now
                  <button onClick={() => setOnlyActiveNow(false)} className="ml-0.5 hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {gradeFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                  Grade {gradeFilter}
                  <button onClick={() => setGradeFilter("")} className="ml-0.5 hover:text-slate-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedSubjects.map((subject) => (
                <span
                  key={subject.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-full"
                >
                  {subject.name}
                  <button onClick={() => removeSubject(subject.id)} className="ml-0.5 hover:text-brand-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {activeFilterCount > 1 && (
                <button
                  onClick={() => { setStudentSubjectIds([]); setGradeFilter(""); setOnlyActiveNow(false); }}
                  className="text-xs text-slate-400 hover:text-red-500 font-medium px-2 py-1 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {subjectsError && (
          <div className="mb-6 px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
            {subjectsError}
          </div>
        )}

        {/* Available Now rail */}
        {!loading && activeNowTutors.length > 0 && validStudentSubjectIds.length === 0 && (
          <AvailableNowRail tutors={activeNowTutors} onConnect={openConnectNow} />
        )}

        {/* All Tutors */}
        {validStudentSubjectIds.length === 0 && (displayedTutors.length > 0 || loading) && (
          <TutorSection
            title={query ? `Results for "${query}"` : "All Tutors"}
            icon={<Users className="w-4 h-4 text-brand-500" />}
            tutors={displayedTutors}
            loading={loading}
            onConnectNow={openConnectNow}
            savedIds={savedIds}
            onToggleSave={toggleSave}
          />
        )}
        {/* No results for an active search */}
        {validStudentSubjectIds.length === 0 && !loading && displayedTutors.length === 0 && query && (
          <div className="text-center py-20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Search className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">No tutors match &ldquo;{query}&rdquo;</h3>
            <p className="text-slate-400 text-sm">Try a course code like MCV4U, a subject, or a school name.</p>
            <button
              onClick={() => setQuery("")}
              className="mt-4 inline-block px-4 py-2 bg-brand-600 text-white text-xs font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              Clear search
            </button>
          </div>
        )}
        {/* Cold start — no tutors at all */}
        {validStudentSubjectIds.length === 0 && !loading && tutors.length === 0 && !query && (
          <div className="text-center py-20 max-w-sm mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Be first in line</h3>
            <p className="text-slate-400 text-sm">
              We&rsquo;re onboarding verified student tutors from across Ontario universities. Tell us
              the course you need and we&rsquo;ll notify you the moment a tutor goes live.
            </p>
            <a
              href={`mailto:hello@learnpeers.com?subject=${encodeURIComponent("Tutor request")}&body=${encodeURIComponent("Hi! I'm looking for a tutor for: ")}`}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              Request a tutor
            </a>
          </div>
        )}

        {/* Per-subject sections */}
        {validStudentSubjectIds.length > 0 &&
          subjects.length > 0 &&
          validStudentSubjectIds
            .filter((id): id is string => typeof id === "string" && id.length > 0)
            .map((subjectId) => {
              const subject = subjects.find((s) => typeof s.id === "string" && s.id === subjectId);
              if (!subject) return null;
              const tutorsForSubject = filterAndSortTutors(getSubjectTutors(subjectId), query, sortBy);
              if (!loading && tutorsForSubject.length === 0) return null;
              return (
                <TutorSection
                  key={`subject-${subjectId}`}
                  title={`${subject.name} (${subject.code})`}
                  icon={<BookOpen className="w-4 h-4 text-brand-500" />}
                  tutors={tutorsForSubject}
                  loading={loading}
                  onConnectNow={openConnectNow}
                />
              );
            })}

        {validStudentSubjectIds.length > 0 && (
          <TutorSection
            title="All Matching Tutors"
            icon={<Users className="w-4 h-4 text-brand-500" />}
            tutors={filterAndSortTutors(allTutorsForSelectedSubjects, query, sortBy)}
            loading={loading}
            onConnectNow={openConnectNow}
            savedIds={savedIds}
            onToggleSave={toggleSave}
          />
        )}

        {validStudentSubjectIds.length > 0 && !loading && allTutorsForSelectedSubjects.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">No tutors found</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              No tutors have availability for your selected subjects right now. Try adjusting your filters.
            </p>
            <a
              href={`mailto:hello@learnpeers.com?subject=${encodeURIComponent("Tutor request")}&body=${encodeURIComponent(
                `Hi! I couldn't find a tutor for: ${validStudentSubjectIds
                  .map((id) => subjects.find((s) => s.id === id))
                  .filter((s): s is Subjects => !!s)
                  .map((s) => `${s.name} (${s.code})`)
                  .join(", ")}. Please let me know when one's available.`
              )}`}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              Request this course
            </a>
          </div>
        )}
      </div>

      <FilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        categories={categories}
        selectedSubjectIds={validStudentSubjectIds}
        onToggleSubject={toggleSubject}
        onClearAll={() => setStudentSubjectIds([])}
        gradeFilter={gradeFilter}
        onGradeChange={setGradeFilter}
        onlyActiveNow={onlyActiveNow}
        onActiveNowChange={setOnlyActiveNow}
        subjectsLoading={subjectsLoading}
        resultCount={loading ? null : matchingTutorCount}
      />
    </div>
  );
}
