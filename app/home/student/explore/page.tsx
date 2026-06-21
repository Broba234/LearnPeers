"use client";
import { useEffect, useState, useContext, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { TutorProfileModalContext } from "@/components/ui/components/common/TutorProfileModalContext";
import { FilterModal } from "@/components/FilterModal";
import Avatar from "@/components/ui/Avatar";
import { toast } from "sonner";
import {
  SlidersHorizontal,
  X,
  Star,
  Clock,
  BookOpen,
  GraduationCap,
  Users,
  Globe,
  Zap,
  Search,
  BadgeCheck,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Heart,
} from "lucide-react";

export type Subjects = {
  id: string;
  name: string;
  code: string;
  grade: number;
  category?: string;
  duration_1?: number | string | null;
  duration_2?: number | string | null;
  duration_3?: number | string | null;
  price_1?: number | string | null;
  price_2?: number | string | null;
  price_3?: number | string | null;
  // trust layer (present on tutor.subjects from available-tutors)
  verified?: boolean;
  grade_label?: string | null;
  mastery?: number | null;
  sessions_count?: number | null;
  course_rating?: number | null;
  course_rating_count?: number | null;
  tier?: string | null;
};

type CategoryGroup = {
  name: string;
  subjects: Subjects[];
};

type AvailableSlot = {
  subject_id?: string | null;
  start_time?: string | Date | null;
  end_time?: string | Date | null;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
};

type VerifiedSchool = { name: string | null; abbreviation: string | null; kind: string };
type TopCourse = { code: string | null; name: string | null; grade_label: string | null; mastery: number | null };

type Tutor = {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  rating?: number | null;
  isAvailableNow?: boolean | null;
  derivedActiveNow?: boolean;
  education?: string | null;
  timezone?: string | null;
  subjects: Subjects[];
  availableSlots?: AvailableSlot[];
  // trust layer (tutor level)
  verifiedSchool?: VerifiedSchool | null;
  schoolName?: string | null;
  schoolAbbr?: string | null;
  totalSessions?: number;
  totalReviews?: number;
  verifiedCount?: number;
  topCourse?: TopCourse | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toSlotMinutes = (value?: string | Date | null): number | null => {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.match(/T(\d{2}):(\d{2})/);
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

function countTimeSlots(availableSlots: AvailableSlot[]): number {
  const SLOT_DURATION = 30;
  const unique = new Set<number>();
  for (const slot of availableSlots) {
    const start = toSlotMinutes(slot.start_time);
    const end = toSlotMinutes(slot.end_time);
    if (start === null || end === null || end <= start) continue;
    for (let t = start; t + SLOT_DURATION <= end; t += SLOT_DURATION) {
      unique.add(t);
    }
  }
  return unique.size;
}

function formatTimezone(tz: string): string {
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  return city;
}

function currentTimeInTz(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function getStartingPrice(subjects: Subjects[]): number | null {
  let min: number | null = null;
  for (const s of subjects) {
    for (const p of [s.price_1, s.price_2, s.price_3]) {
      const n = typeof p === "string" ? parseFloat(p) : p;
      if (typeof n === "number" && !isNaN(n) && (min === null || n < min))
        min = n;
    }
  }
  return min;
}

// ─── Search + sort ────────────────────────────────────────────────────────────
type SortKey = "recommended" | "rating" | "sessions" | "price";
const SORT_LABELS: Record<SortKey, string> = {
  recommended: "Recommended",
  rating: "Top rated",
  sessions: "Most sessions",
  price: "Price: low to high",
};

function tutorMatchesQuery(tutor: Tutor, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (tutor.name?.toLowerCase().includes(needle)) return true;
  if (tutor.schoolName?.toLowerCase().includes(needle)) return true;
  if (tutor.schoolAbbr?.toLowerCase().includes(needle)) return true;
  if (tutor.verifiedSchool?.name?.toLowerCase().includes(needle)) return true;
  return (tutor.subjects ?? []).some(
    (s) =>
      s.code?.toLowerCase().includes(needle) ||
      s.name?.toLowerCase().includes(needle)
  );
}

function filterAndSortTutors(list: Tutor[], q: string, sortBy: SortKey): Tutor[] {
  const filtered = q ? list.filter((t) => tutorMatchesQuery(t, q)) : list.slice();
  switch (sortBy) {
    case "rating":
      filtered.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
      break;
    case "sessions":
      filtered.sort((a, b) => (b.totalSessions ?? 0) - (a.totalSessions ?? 0));
      break;
    case "price":
      filtered.sort((a, b) => {
        const pa = getStartingPrice(a.subjects ?? []) ?? Infinity;
        const pb = getStartingPrice(b.subjects ?? []) ?? Infinity;
        return pa - pb;
      });
      break;
    // "recommended" keeps the server ordering (live first, then credibility)
  }
  return filtered;
}

// ─── Available Now Rail ───────────────────────────────────────────────────────
const AvailableNowRail = ({
  tutors,
  onConnect,
}: {
  tutors: Tutor[];
  onConnect: (tutor: Tutor) => void;
}) => {
  if (tutors.length === 0) return null;
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
        Available Now
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {tutors.map((tutor) => (
          <button
            key={tutor.id}
            onClick={() => onConnect(tutor)}
            className="flex flex-col items-center gap-2 flex-shrink-0 group"
          >
            <div className="relative">
              <img
                src={tutor.avatar || "/default-avatar.png"}
                alt={tutor.name}
                className="w-14 h-14 rounded-full object-cover bg-slate-100 ring-2 ring-green-400 ring-offset-2"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <span className="text-xs font-medium text-slate-700 max-w-[56px] truncate text-center group-hover:text-brand-600 transition-colors">
              {tutor.name.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Verified school pill ─────────────────────────────────────────────────────
const SchoolBadge = ({ tutor }: { tutor: Tutor }) => {
  const verified = tutor.verifiedSchool;
  const label = verified?.abbreviation || verified?.name || tutor.schoolAbbr || tutor.schoolName;
  if (!label) return null;
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
        <BadgeCheck className="h-3 w-3" />
        Verified {label} student
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      <GraduationCap className="h-3 w-3" />
      {label}
    </span>
  );
};

// ─── Tutor Card ───────────────────────────────────────────────────────────────
const TutorCard = ({
  tutor,
  onBook,
  onConnectNow,
  saved,
  onToggleSave,
}: {
  tutor: Tutor;
  onBook: (tutor: Tutor) => void;
  onConnectNow?: (tutor: Tutor) => void;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) => {
  const slotsToday = useMemo(
    () => countTimeSlots(Array.isArray(tutor.availableSlots) ? tutor.availableSlots : []),
    [tutor.availableSlots]
  );

  const startingPrice = useMemo(() => getStartingPrice(tutor.subjects ?? []), [tutor.subjects]);
  const tzTime = tutor.timezone ? currentTimeInTz(tutor.timezone) : null;

  // Verified courses, headlined by mastery — the peer-proof that beats Wyzant.
  const verifiedSubjects = useMemo(
    () =>
      (tutor.subjects ?? [])
        .filter((s) => s.verified && s.grade_label)
        .sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0)),
    [tutor.subjects]
  );
  const sessions = tutor.totalSessions ?? 0;
  const reviews = tutor.totalReviews ?? 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 overflow-hidden">
      <div className="p-5">
        {/* Top row: avatar + name + price */}
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <Avatar src={tutor.avatar} name={tutor.name} className="w-14 h-14 ring-1 ring-slate-100" />
            {tutor.derivedActiveNow && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{tutor.name}</h3>
                  {tutor.derivedActiveNow && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 flex-shrink-0">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Online
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <SchoolBadge tutor={tutor} />
                </div>
              </div>
              {startingPrice !== null && (
                <div className="flex-shrink-0 text-right">
                  <span className="text-[11px] text-slate-400">from</span>
                  <div>
                    <span className="text-sm font-semibold text-slate-900">${startingPrice.toFixed(0)}</span>
                    <span className="text-xs text-slate-400">/hr</span>
                  </div>
                </div>
              )}
            </div>

            {/* Proof row: rating · reviews · sessions */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              {typeof tutor.rating === "number" ? (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-slate-700">{tutor.rating.toFixed(2)}</span>
                  {reviews > 0 && <span className="text-xs text-slate-400">({reviews})</span>}
                </div>
              ) : (
                <span className="text-xs text-slate-300">New tutor</span>
              )}
              {sessions > 0 && (
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{sessions}</span> sessions
                </span>
              )}
              {slotsToday > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">{slotsToday} slots today</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Headline proof — the single best course, front and center */}
        {tutor.topCourse?.grade_label && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <p className="text-xs text-emerald-900">
              Aced{" "}
              <span className="font-mono font-semibold">{tutor.topCourse.code}</span>
              {" — "}
              <span className="font-bold">{tutor.topCourse.grade_label}</span>
              <span className="text-emerald-700/70"> · grade verified</span>
            </p>
          </div>
        )}

        {/* Verified course chips (code + grade) */}
        {verifiedSubjects.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {verifiedSubjects.slice(0, 4).map((s, idx) => (
              <span
                key={idx}
                title={s.name}
                className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100"
              >
                <span className="font-mono font-semibold text-slate-800">{s.code}</span>
                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                  <BadgeCheck className="h-3 w-3" />
                  {s.grade_label}
                </span>
              </span>
            ))}
            {verifiedSubjects.length > 4 && (
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-100">
                +{verifiedSubjects.length - 4}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(tutor.subjects ?? []).slice(0, 3).map((s, idx) => (
              <span key={idx} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full">
                {s.code ? <span className="font-mono text-brand-700">{s.code}</span> : s.name}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 flex items-center gap-2">
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(tutor.id)}
              aria-label={saved ? "Remove from saved" : "Save tutor"}
              aria-pressed={saved}
              className={`flex items-center justify-center w-10 py-2.5 rounded-xl border transition-colors ${
                saved
                  ? "border-rose-200 bg-rose-50 text-rose-500"
                  : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-rose-400"
              }`}
            >
              <Heart className={`w-4 h-4 ${saved ? "fill-rose-500" : ""}`} />
            </button>
          )}
          <Link
            href={`/tutor/${tutor.id}`}
            className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors text-center"
          >
            View profile
          </Link>
          {tutor.derivedActiveNow && onConnectNow && (
            <button
              onClick={() => onConnectNow(tutor)}
              title="Start a live session now"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-14 h-14 rounded-full bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 bg-slate-200 rounded w-32" />
          <div className="h-4 bg-slate-200 rounded w-12" />
        </div>
        <div className="h-3 bg-slate-200 rounded w-48" />
        <div className="h-3 bg-slate-200 rounded w-36" />
      </div>
    </div>
    <div className="flex gap-1.5 mt-3">
      <div className="h-5 bg-slate-200 rounded-full w-16" />
      <div className="h-5 bg-slate-200 rounded-full w-20" />
      <div className="h-5 bg-slate-200 rounded-full w-14" />
    </div>
    <div className="h-10 bg-slate-200 rounded-xl mt-4 w-full" />
  </div>
);

// ─── Tutor Section ────────────────────────────────────────────────────────────
const TutorSection = ({
  title,
  icon,
  tutors,
  loading,
  onBook,
  onConnectNow,
  savedIds,
  onToggleSave,
}: {
  title: string;
  icon?: React.ReactNode;
  tutors: Tutor[];
  loading: boolean;
  onBook: (tutor: Tutor) => void;
  onConnectNow?: (tutor: Tutor) => void;
  savedIds?: Set<string>;
  onToggleSave?: (id: string) => void;
}) => {
  if (!loading && tutors.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2.5 mb-4">
        {icon}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {!loading && (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {tutors.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
          : tutors.map((tutor) => (
              <TutorCard
                key={tutor.id}
                tutor={tutor}
                onBook={onBook}
                onConnectNow={onConnectNow}
                saved={savedIds?.has(tutor.id)}
                onToggleSave={onToggleSave}
              />
            ))}
      </div>
    </div>
  );
};

type StudentSubject = { subject_id: string; institution_course_id?: string | null; name?: string; code?: string };

// ─── Main Page ────────────────────────────────────────────────────────────────
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
        body: JSON.stringify({ sessionId }),
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
  // auto-open that tutor's booking once the list has loaded.
  useEffect(() => {
    if (loading || tutors.length === 0) return;
    const tid = new URLSearchParams(window.location.search).get("tutor");
    if (!tid) return;
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
            onBook={openTutorProfileModal}
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
              href="/#contact"
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
                  onBook={openTutorProfileModal}
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
            onBook={openTutorProfileModal}
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
      />
    </div>
  );
}
