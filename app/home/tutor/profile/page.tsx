"use client";
import { useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LearnPeersLoader from "@/components/ui/LearnPeersLoader";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
// Tiptap pulls in a sizeable editor bundle; only load it client-side when the
// tutor actually edits their bio.
const TiptapEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });
import { motion } from "framer-motion";
import SubjectSelectProfile from "@/components/ui/components/SubjectSelectProfile";
import WizardTimeSlot from "@/components/ui/components/WizardTimeSlot";
import { getCountryFromTimezone } from "@/lib/timezone-to-country";
import { toast } from "sonner";
import UpdateProfileTimeSlot from "@/components/ui/components/UpdateProfileTimeSlot";
import Image from "next/image";
import DOMPurify from "dompurify";
import EmbeddedOnboarding from "@/components/stripe/EmbeddedOnboarding";

export type Subjects = {
  id: string;
  name: string;
  code: string;
  grade: number;
  category?: string;
  created_at?: Date;
  updated_at?: Date;
};
type CategoryGroup = {
  name: string;
  subjects: Subjects[];
};

export default function TutorProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editMode1, setEditMode1] = useState(false);
  const [editMode2, setEditMode2] = useState(false);
  const [editMode3, setEditMode3] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const router = useRouter();

  const [educationText, setEducationText] = useState<string>("");
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [selectedSubjectsWithPrice, setSelectedSubjectsWithPrice] = useState<any[]>([]);
  const [error, setError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const fetchStripeStatus = async (email: string) => {
    try {
      const res = await fetch(`/api/stripe/connect/status?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setOnboardingComplete(Boolean(data.onboardingComplete));
      }
    } catch {
      /* non-fatal */
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) { router.push("/auth/login"); return; }
      const profileRes = await fetch(`/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        if (profileData?.email) fetchStripeStatus(profileData.email);
        setEditName(profileData.name || "");
        setEditPhone(profileData.phone || "");
        setEditBio(profileData.bio || "");
        setEditHourlyRate(profileData.hourlyRate?.toString() || "");
        if (profileData.education) {
          setEducationText(String(profileData.education) || "");
        } else {
          setEducationText("");
        }
        let normalizedSubjects: string[] = [];
        if (profileData.subjects && Array.isArray(profileData.subjects)) {
          normalizedSubjects = profileData.subjects
            .map((s: any) => {
              if (s && typeof s.id === "string") return s.id;
              if (s && s.Subjects && typeof s.Subjects.id === "string") return s.Subjects;
              return undefined;
            })
            .filter(
              (subject: any): subject is Subjects =>
                typeof subject.id === "string" && subject.id.length > 0
            );
        }
        setSelectedSubjects(normalizedSubjects);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetch("/api/subjects")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const catMap = new Map<string, Subjects[]>();
          data.forEach((subject: Subjects) => {
            const cat = subject.category || "Uncategorized";
            if (!catMap.has(cat)) catMap.set(cat, []);
            catMap.get(cat)!.push(subject);
          });
          const grouped: CategoryGroup[] = Array.from(catMap.entries()).map(([name, subjects]) => ({ name, subjects }));
          setCategories(grouped);
        } else {
          setSelectedSubjects([]);
          setCategories([]);
        }
      })
      .catch(() => { setSelectedSubjects([]); setCategories([]); });
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    const hourlyRate = editHourlyRate ? parseFloat(editHourlyRate) : null;
    await fetch("/api/profiles/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, name: editName, phone: editPhone, bio: editBio, hourlyRate }),
    });
    setProfile({ ...profile, name: editName, phone: editPhone, bio: editBio, hourlyRate });
    setSaving(false);
  };

  const handleSaveEducation = async () => {
    setSaving(true);
    await fetch("/api/profiles/update-education", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, education: educationText }),
    });
    setProfile({ ...profile, education: educationText });
    setSaving(false);
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.email) return;
    try {
      setAvatarUploading(true);
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9-_.]/g, "-");
      const filePath = `avatars/${profile.email}-${Date.now()}-${sanitizedFileName}`;
      const { error: uploadError } = await supabase.storage.from("eclero-storage").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("eclero-storage").getPublicUrl(filePath);
      await fetch("/api/profiles/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, name: profile.name, phone: profile.phone, bio: profile.bio, hourlyRate: profile.hourlyRate, avatar: publicUrl }),
      });
      setProfile({ ...profile, avatar: publicUrl });
    } catch (error: any) {
      console.error("Error uploading avatar:", error?.message || error);
      toast.error("Failed to upload profile picture. Please try again.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const onSubjectsChange = (subjects: any) => {
    setError(false);
    setErrorMsg("");
    setSelectedSubjects(subjects);
  };

  const handleSubjectsChange = async () => {
    if (!profile?.email) return;
    if (selectedSubjectsWithPrice.length === 0) {
      setError(true);
      setErrorMsg("Please select all subjects and time slots with prices");
      return;
    }
    const hasInvalidPriceOrDuration = selectedSubjectsWithPrice.some(
      (subject) =>
        !subject?.duration_1 || Number(subject?.price_1) <= 0 ||
        !subject?.duration_2 || Number(subject?.price_2) <= 0 ||
        !subject?.duration_3 || Number(subject?.price_3) <= 0
    );
    if (hasInvalidPriceOrDuration) {
      setError(true);
      setErrorMsg("Please add prices and select durations for all session lengths");
      return;
    }
    Swal.fire({
      title: "Are you sure?",
      text: "All availablity records will be deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Proceed!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch("/api/subjects/update-subjects-and-prices", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: profile.email, subjects: selectedSubjectsWithPrice }),
          });
        } catch (e) {}
        setEditMode3(false);
        setStep(1);
        fetchProfile();
        Swal.fire({ title: "Updated!", text: "Your subjects have been updated.", icon: "success" });
      }
    });
  };

  const handleStripe = async () => {
    // Not fully onboarded yet → embedded onboarding (in-app, no redirect).
    if (!onboardingComplete) {
      setShowOnboarding(true);
      return;
    }
    // Fully onboarded → open the Stripe Express dashboard to manage payouts.
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStripeLoading(false);
        toast.error(data.error || "Failed to open Stripe dashboard");
      }
    } catch {
      setStripeLoading(false);
      toast.error("Failed to open Stripe dashboard");
    }
  };

  const handleOnboardingExit = () => {
    setShowOnboarding(false);
    // Re-check status; capabilities may now be active.
    if (profile?.email) {
      fetchStripeStatus(profile.email);
      fetchProfile();
    }
  };

  if (loading) {
    return <LearnPeersLoader fullScreen label="Loading profile…" />;
  }
  if (!profile) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="text-sm text-slate-400">Profile not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage your public profile and payout settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Identity */}
          <div className="space-y-4">

            {/* Avatar card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="relative w-24 h-24">
                  <Image
                    src={profile.avatar || "/default-avatar.png"}
                    alt={profile.name}
                    className="rounded-full object-cover bg-slate-100"
                    fill
                  />
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                  {avatarUploading ? (
                    <svg className="animate-spin w-3.5 h-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
                </label>
              </div>
              <h2 className="text-base font-semibold text-slate-900">{profile.name}</h2>
              <span className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">Tutor</span>
              <p className="text-xs text-slate-400 mt-1.5 truncate w-full">{profile.email}</p>
            </div>

            {/* Payout card */}
            <div className={`bg-white rounded-2xl border shadow-sm p-5 ${!onboardingComplete ? "border-amber-200" : "border-slate-100"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${onboardingComplete ? "bg-green-50" : "bg-amber-50"}`}>
                  <svg className={`w-4 h-4 ${onboardingComplete ? "text-green-600" : "text-amber-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Payouts</p>
                  <p className="text-xs text-slate-500">
                    {onboardingComplete
                      ? "Payouts active"
                      : profile.stripe_account_id
                        ? "Setup incomplete"
                        : "Not connected"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleStripe}
                disabled={stripeLoading}
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                  onboardingComplete
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {stripeLoading
                  ? "Opening…"
                  : onboardingComplete
                    ? "Manage payouts"
                    : profile.stripe_account_id
                      ? "Finish setup"
                      : "Set up payouts"}
              </button>
            </div>
          </div>

          {/* RIGHT — Details */}
          <div className="lg:col-span-2 space-y-4">

            {/* Personal Info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Personal Info</h3>
                {!editMode1 && (
                  <button
                    onClick={() => { setEditMode1(true); setEditMode2(false); setEditMode3(false); }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Full Name</label>
                  <input
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 transition-colors ${
                      editMode1
                        ? "bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        : "bg-slate-50 border-slate-100 cursor-default"
                    }`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={!editMode1 || saving}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Bio</label>
                  <textarea
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 resize-none min-h-[96px] transition-colors ${
                      editMode1
                        ? "bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        : "bg-slate-50 border-slate-100 cursor-default"
                    }`}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    disabled={!editMode1 || saving}
                    placeholder="Tell students about your experience and teaching style..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                    <input
                      className="w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-400 cursor-default"
                      value={profile.email}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
                    <input
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 transition-colors ${
                        editMode1
                          ? "bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          : "bg-slate-50 border-slate-100 cursor-default"
                      }`}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      disabled={!editMode1 || saving}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
                {editMode1 && (
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setEditMode1(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Courses — managed in the gamified portfolio */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Courses you tutor</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Live courses students can book right now</p>
                </div>
                <button
                  onClick={() => router.push("/home/tutor/courses")}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Manage portfolio →
                </button>
              </div>
              <div className="px-6 py-5">
                {Array.isArray(profile.subjects) && profile.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects.map((subject: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm text-slate-900">{subject.Subjects?.name || subject.name}</span>
                        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-100">{subject.Subjects?.code || subject.code}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">
                    No live courses yet. Head to{" "}
                    <button onClick={() => router.push("/home/tutor/courses")} className="text-brand-600 font-medium hover:underline">
                      your course portfolio
                    </button>{" "}
                    to verify a grade and unlock the right to tutor.
                  </div>
                )}
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Education</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Degrees, institutions, and qualifications</p>
                </div>
                {!editMode2 && (
                  <button
                    onClick={() => { setEditMode2(true); setEditMode1(false); setEditMode3(false); }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="px-6 py-5">
                {editMode2 ? (
                  <>
                    <TiptapEditor onChange={setEducationText} value={educationText} />
                    <div className="pt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setEditMode2(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEducation}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="education-content">
                    {educationText ? (
                      <div className="rendered-html-content text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(educationText) }} />
                    ) : (
                      <p className="text-sm text-slate-400">No education info yet. Click Edit to add your qualifications.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {showOnboarding && profile?.email && (
        <EmbeddedOnboarding
          email={profile.email}
          country={getCountryFromTimezone()}
          onExit={handleOnboardingExit}
          onClose={handleOnboardingExit}
        />
      )}
    </div>
  );
}
