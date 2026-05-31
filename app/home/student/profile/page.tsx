"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function StudentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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
          setEditName(profileData.name || "");
          setEditPhone(profileData.phone || "");
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleCancel = () => {
    setEditName(profile.name || "");
    setEditPhone(profile.phone || "");
    setEditMode(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/profiles/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, name: editName, phone: editPhone }),
    });
    setProfile({ ...profile, name: editName, phone: editPhone });
    setEditMode(false);
    setSaving(false);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        body: JSON.stringify({ email: profile.email, name: profile.name, phone: profile.phone, bio: profile.bio, avatar: publicUrl }),
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="text-sm text-slate-400">Loading profile...</div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="text-sm text-slate-400">Profile not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-400 mt-0.5">Your personal info and learning preferences</p>
        </div>

        <div className="space-y-5">

          {/* Identity card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <img
                  src={profile.avatar || "/default-avatar.png"}
                  alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover bg-slate-100"
                />
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                  {avatarUploading ? (
                    <svg className="animate-spin w-3 h-3 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-900">{profile.name}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{profile.email}</p>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Student</span>
              </div>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex-shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Info</h3>
            <div className="space-y-4">
              {editMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
                  <input
                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Full name"
                    disabled={saving}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                <div className="w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-400">
                  {profile.email}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
                {!editMode ? (
                  <div className="w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-900">
                    {profile.phone || <span className="text-slate-400">Not provided</span>}
                  </div>
                ) : (
                  <input
                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone number"
                    disabled={saving}
                  />
                )}
              </div>
            </div>
          </div>


</div>
      </div>
    </div>
  );
}
