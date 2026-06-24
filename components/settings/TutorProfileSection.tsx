"use client";
import { useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LearnPeersLoader from "@/components/ui/LearnPeersLoader";
import dynamic from "next/dynamic";
// Tiptap pulls in a sizeable editor bundle; only load it client-side when the
// tutor actually edits their bio.
const TiptapEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });
import { getCountryFromTimezone } from "@/lib/timezone-to-country";
import { toast } from "sonner";
import Image from "next/image";
import DOMPurify from "dompurify";
import EmbeddedOnboarding from "@/components/stripe/EmbeddedOnboarding";

export default function TutorProfileSection() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode1, setEditMode1] = useState(false);
  const [editMode2, setEditMode2] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const router = useRouter();

  const [educationText, setEducationText] = useState<string>("");
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
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setEditMode1(false);
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
    setEditMode2(false);
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
    return (
      <div className="flex justify-center py-16">
        <LearnPeersLoader size={120} label="Loading profile…" />
      </div>
    );
  }
  if (!profile) {
    return <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">Profile not found.</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Identity */}
        <div className="space-y-4">

          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center dark:bg-ink-900 dark:border-ink-800">
            <div className="relative mb-4">
              <div className="relative w-24 h-24">
                <Image
                  src={profile.avatar || "/default-avatar.png"}
                  alt={profile.name}
                  className="rounded-full object-cover bg-slate-100 dark:bg-ink-800"
                  fill
                />
              </div>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors dark:bg-ink-800 dark:border-ink-700 dark:hover:bg-ink-700">
                {avatarUploading ? (
                  <svg className="animate-spin w-3.5 h-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
              </label>
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{profile.name}</h2>
            <span className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">Tutor</span>
            <p className="text-xs text-slate-400 mt-1.5 truncate w-full dark:text-slate-500">{profile.email}</p>
          </div>

          {/* Payout card */}
          <div className={`bg-white rounded-2xl border shadow-sm p-5 dark:bg-ink-900 ${!onboardingComplete ? "border-amber-200 dark:border-amber-500/40" : "border-slate-100 dark:border-ink-800"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${onboardingComplete ? "bg-green-50 dark:bg-green-950/40" : "bg-amber-50 dark:bg-amber-950/40"}`}>
                <svg className={`w-4 h-4 ${onboardingComplete ? "text-green-600 dark:text-green-400" : "text-amber-500 dark:text-amber-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Payouts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-ink-800 dark:text-slate-200 dark:hover:bg-ink-700"
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm dark:bg-ink-900 dark:border-ink-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-ink-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Personal Info</h3>
              {!editMode1 && (
                <button
                  onClick={() => { setEditMode1(true); setEditMode2(false); }}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Full Name</label>
                <input
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 transition-colors dark:text-slate-100 ${
                    editMode1
                      ? "bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-ink-800 dark:border-ink-700"
                      : "bg-slate-50 border-slate-100 cursor-default dark:bg-ink-800 dark:border-ink-700"
                  }`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!editMode1 || saving}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Bio</label>
                <textarea
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 resize-none min-h-[96px] transition-colors dark:text-slate-100 ${
                    editMode1
                      ? "bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-ink-800 dark:border-ink-700"
                      : "bg-slate-50 border-slate-100 cursor-default dark:bg-ink-800 dark:border-ink-700"
                  }`}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  disabled={!editMode1 || saving}
                  placeholder="Tell students about your experience and teaching style..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Email</label>
                  <input
                    className="w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-400 cursor-default dark:bg-ink-800 dark:border-ink-700 dark:text-slate-500"
                    value={profile.email}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 dark:text-slate-400">Phone</label>
                  <input
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 transition-colors dark:text-slate-100 ${
                      editMode1
                        ? "bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-ink-800 dark:border-ink-700"
                        : "bg-slate-50 border-slate-100 cursor-default dark:bg-ink-800 dark:border-ink-700"
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
                    className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors dark:text-slate-300 dark:border-ink-700 dark:hover:bg-ink-800"
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm dark:bg-ink-900 dark:border-ink-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-ink-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Courses you tutor</h3>
                <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-500">Live courses students can book right now</p>
              </div>
              <button
                onClick={() => router.push("/home/tutor/courses")}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors dark:text-brand-400 dark:hover:text-brand-300"
              >
                Manage portfolio →
              </button>
            </div>
            <div className="px-6 py-5">
              {Array.isArray(profile.subjects) && profile.subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.subjects.map((subject: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-900 dark:text-slate-100">{subject.Subjects?.name || subject.name}</span>
                      <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-100 dark:text-slate-300 dark:bg-ink-800 dark:border-ink-700">{subject.Subjects?.code || subject.code}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500">
                  No live courses yet. Head to{" "}
                  <button onClick={() => router.push("/home/tutor/courses")} className="text-brand-600 font-medium hover:underline dark:text-brand-400">
                    your course portfolio
                  </button>{" "}
                  to verify a grade and unlock the right to tutor.
                </div>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm dark:bg-ink-900 dark:border-ink-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-ink-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Education</h3>
                <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-500">Degrees, institutions, and qualifications</p>
              </div>
              {!editMode2 && (
                <button
                  onClick={() => { setEditMode2(true); setEditMode1(false); }}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors dark:text-brand-400 dark:hover:text-brand-300"
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
                      className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors dark:text-slate-300 dark:border-ink-700 dark:hover:bg-ink-800"
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
                    <div className="rendered-html-content text-sm text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(educationText) }} />
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">No education info yet. Click Edit to add your qualifications.</p>
                  )}
                </div>
              )}
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
    </>
  );
}
