"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SubjectSelector from "@/components/SubjectSelector";

export default function StudentCourses() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Array<{ subject_id: string; institution_course_id?: string | null }>>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !user) { router.push("/auth/login"); return; }
        const profileRes = await fetch(`/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          // Normalize subjects from profile
          const normalized: Array<{ subject_id: string; institution_course_id?: string | null }> = [];
          if (Array.isArray(profileData.subjects)) {
            for (const s of profileData.subjects) {
              const subject_id = typeof s === "string" ? s : s?.id;
              const institution_course_id = s?.institution_course_id || null;
              if (subject_id) normalized.push({ subject_id, institution_course_id });
            }
          }
          setSubjects(normalized);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleSubjectsChange = async (items: Array<{ subject_id: string; institution_course_id?: string | null }>) => {
    if (!profile?.email) return;
    setSubjects(items);
    await fetch("/api/profiles/student/update-subjects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, subjects: items }),
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="text-sm text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">My Courses</h1>
          <p className="text-sm text-slate-400 mt-0.5">Courses you're studying — tutors are matched by your exact course code</p>
        </div>

        {/* Institution info banner */}
        {profile?.Institutions && (
          <div className="mb-6 flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">{profile.Institutions.name}</p>
              <p className="text-xs text-indigo-500">Showing courses from your institution</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Your courses</p>
              <p className="text-xs text-slate-400 mt-0.5">These match you with tutors who took the same course</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${subjects.length >= 5 ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
              {subjects.length} / 5
            </span>
          </div>
          <SubjectSelector
            selectedSubjectIds={subjects.map(s => s.subject_id)}
            onSelectionChange={handleSubjectsChange}
            maxSelections={5}
            disabled={false}
            institutionId={profile?.institution_id}
          />
        </div>

      </div>
    </div>
  );
}
