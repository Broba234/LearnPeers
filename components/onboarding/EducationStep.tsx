"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, GraduationCap, School, Mail, Loader2, Users } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";

type Institution = {
  id: string;
  name: string;
  abbreviation?: string | null;
  type: string;
  city?: string | null;
  email_domains: string[];
};

type Props = {
  // Tutors must verify a university affiliation with a school email.
  // Students just declare; verification documents come later via profile.
  requireVerification: boolean;
  allowSkip?: boolean;
  onComplete: (complete: boolean) => void;
};

const inputClass =
  "w-full bg-white border border-ink-200 px-4 py-3 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all";

/**
 * Cascading school picker: pick a school board (required), then pick the
 * routed high school within that board. Falls back to free-text for schools
 * not in the public dataset (e.g. private schools). Declares the chosen
 * school under the given `kind` (current vs former high school).
 */
function SchoolByBoardPicker({
  boards,
  kind,
  saved,
  savedName,
  onSaved,
  ctaLabel,
}: {
  boards: Institution[];
  kind: "current_high_school" | "former_high_school";
  saved: boolean;
  savedName: string;
  onSaved: (name: string) => void;
  ctaLabel: string;
}) {
  const [boardId, setBoardId] = useState("");
  const [schools, setSchools] = useState<Institution[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Load the routed schools whenever the board changes.
  useEffect(() => {
    setSchoolId("");
    setManual(false);
    if (!boardId) {
      setSchools([]);
      return;
    }
    setLoadingSchools(true);
    fetch(`/api/institutions?type=high_school&board_id=${boardId}`)
      .then((r) => r.json())
      .then((d) => setSchools(Array.isArray(d) ? d : []))
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, [boardId]);

  const selectedSchool = schools.find((s) => s.id === schoolId);

  const save = async () => {
    if (!boardId) return setError("Select your school board");
    const name = manual ? manualName.trim() : selectedSchool?.name;
    if (!manual && !schoolId) return setError("Select your school");
    if (manual && !name) return setError("Enter your school's name");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/education/declare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          // Manual entries still link the board so we keep the affiliation.
          institutionId: manual ? boardId : schoolId,
          institutionName: name,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not save your school");
      onSaved(name!);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (saved) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-800">{savedName}</p>
          <p className="text-sm text-green-700">
            Saved. You can add proof of enrollment later from your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-2">School board</label>
        <SearchableSelect
          value={boardId}
          onChange={setBoardId}
          placeholder="Select your school board…"
          options={boards.map((b) => ({
            value: b.id,
            label: b.name + (b.abbreviation ? ` (${b.abbreviation})` : ""),
          }))}
          className={inputClass}
        />
      </div>

      {/* School appears only after a board is chosen */}
      {boardId && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <label className="block text-sm font-medium text-ink-700 mb-2">School</label>
          {loadingSchools ? (
            <div className="flex items-center gap-2 text-sm text-ink-400 px-1 py-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading schools…
            </div>
          ) : manual ? (
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Upper Canada College"
              className={inputClass}
            />
          ) : (
            <SearchableSelect
              value={schoolId}
              onChange={setSchoolId}
              placeholder={schools.length ? "Select your school…" : "No schools listed for this board"}
              options={schools.map((s) => ({
                value: s.id,
                label: s.name + (s.city ? ` — ${s.city}` : ""),
              }))}
              className={inputClass}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setManual((m) => !m);
              setSchoolId("");
              setManualName("");
            }}
            className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {manual ? "Pick from the list instead" : "My school isn't listed"}
          </button>
        </motion.div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-100 py-2.5 px-4 rounded-xl">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={busy || !boardId || (manual ? !manualName.trim() : !schoolId)}
        className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {ctaLabel}
      </button>
    </div>
  );
}

export default function EducationStep({ requireVerification, allowSkip, onComplete }: Props) {
  const [level, setLevel] = useState<"high_school" | "university" | null>(null);
  const [universities, setUniversities] = useState<Institution[]>([]);
  const [boards, setBoards] = useState<Institution[]>([]);

  // High school path
  const [hsDeclared, setHsDeclared] = useState(false);
  const [hsName, setHsName] = useState("");

  // University path
  const [universityId, setUniversityId] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [uniDeclared, setUniDeclared] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Alumni high school (for university students)
  const [alumniSaved, setAlumniSaved] = useState(false);
  const [alumniName, setAlumniName] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedUniversity = universities.find((u) => u.id === universityId);
  const uniEstablished = requireVerification ? verified : uniDeclared;

  useEffect(() => {
    fetch("/api/institutions?type=university")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setUniversities(d))
      .catch(() => {});
    fetch("/api/institutions?type=school_board")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setBoards(d))
      .catch(() => {});
  }, []);

  // Report completion to the wizard
  useEffect(() => {
    if (level === "high_school") onComplete(hsDeclared);
    else if (level === "university") onComplete(uniEstablished);
    else onComplete(false);
  }, [level, hsDeclared, uniEstablished, onComplete]);

  const declareUniversity = async (id: string) => {
    // Students: declaring is enough. Tutors continue to email verification.
    if (requireVerification) return;
    try {
      const res = await fetch("/api/education/declare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "current_university", institutionId: id }),
      });
      setUniDeclared(res.ok);
    } catch {
      setUniDeclared(false);
    }
  };

  const sendCode = async () => {
    setBusy(true);
    setError("");
    setDevCode(null);
    try {
      const res = await fetch("/api/education/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: universityId, email: schoolEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send the code");
      setCodeSent(true);
      if (data.devCode) setDevCode(data.devCode);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/education/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerified(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step 1 — level selection */}
      <div>
        <p className="text-sm font-medium text-ink-700 mb-3">Where are you studying?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "high_school" as const, label: "I'm in high school", sub: "Grades 9–12", icon: <School className="w-6 h-6" /> },
            { key: "university" as const, label: "I'm in university", sub: "Post-secondary student", icon: <GraduationCap className="w-6 h-6" /> },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setLevel(opt.key);
                setError("");
              }}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                level === opt.key
                  ? "border-brand-600 bg-brand-50 shadow-sm"
                  : "border-ink-100 bg-white hover:border-brand-300"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  level === opt.key ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-500"
                }`}
              >
                {opt.icon}
              </div>
              <div>
                <p className="font-semibold text-ink-900">{opt.label}</p>
                <p className="text-sm text-ink-400">{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2a — high school details (board → school) */}
      {level === "high_school" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SchoolByBoardPicker
            boards={boards}
            kind="current_high_school"
            saved={hsDeclared}
            savedName={hsName}
            onSaved={(name) => {
              setHsName(name);
              setHsDeclared(true);
            }}
            ctaLabel="Save my school"
          />
        </motion.div>
      )}

      {/* Step 2b — university details */}
      {level === "university" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">Your university</label>
            <SearchableSelect
              value={universityId}
              onChange={(val) => {
                setUniversityId(val);
                setCodeSent(false);
                setVerified(false);
                setCode("");
                setDevCode(null);
                if (val) declareUniversity(val);
              }}
              placeholder="Select your university…"
              options={universities.map((u) => ({ value: u.id, label: u.name + (u.city ? ` — ${u.city}` : "") }))}
              className={inputClass}
            />
          </div>

          {requireVerification && selectedUniversity && !verified && (
            <div className="p-5 rounded-2xl border border-ink-100 bg-ink-50/50 space-y-4">
              <div className="flex items-center gap-2 text-ink-700">
                <Mail className="w-4 h-4 text-brand-600" />
                <p className="text-sm font-medium">
                  Verify with your {selectedUniversity.abbreviation || selectedUniversity.name} email
                </p>
              </div>
              {!codeSent ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    placeholder={`you@${selectedUniversity.email_domains[0] || "school.ca"}`}
                    className={inputClass + " flex-1"}
                  />
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={busy || !schoolEmail.includes("@")}
                    className="px-5 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2 justify-center"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send code
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink-500">
                    We sent a 6-digit code to <strong className="text-ink-700">{schoolEmail}</strong>.
                  </p>
                  {devCode && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Dev mode (no email provider configured) — your code is <strong>{devCode}</strong>
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className={inputClass + " flex-1 tracking-[0.5em] text-center font-semibold text-lg"}
                    />
                    <button
                      type="button"
                      onClick={confirmCode}
                      disabled={busy || code.length !== 6}
                      className="px-5 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2 justify-center"
                    >
                      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                      Verify
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCodeSent(false);
                      setCode("");
                      setDevCode(null);
                    }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Use a different email
                  </button>
                </div>
              )}
            </div>
          )}

          {verified && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">
                  Verified {selectedUniversity?.abbreviation || selectedUniversity?.name} student
                </p>
                <p className="text-sm text-green-700">Your school email is confirmed.</p>
              </div>
            </div>
          )}

          {!requireVerification && uniDeclared && selectedUniversity && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">
                <strong>{selectedUniversity.name}</strong> saved. You can verify with your school email
                anytime from your profile.
              </p>
            </div>
          )}

          {/* Alumni prompt — connect with people from your old high school */}
          {uniEstablished && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-2 border-t border-ink-100 space-y-3"
            >
              <div className="flex items-center gap-2 text-ink-700">
                <Users className="w-4 h-4 text-brand-600" />
                <p className="text-sm font-medium">Where did you go to high school?</p>
              </div>
              <p className="text-sm text-ink-400 -mt-1">
                Connect with alumni and tutors from your old school.
              </p>
              <SchoolByBoardPicker
                boards={boards}
                kind="former_high_school"
                saved={alumniSaved}
                savedName={alumniName}
                onSaved={(name) => {
                  setAlumniName(name);
                  setAlumniSaved(true);
                }}
                ctaLabel="Add my high school"
              />
            </motion.div>
          )}
        </motion.div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-100 py-2.5 px-4 rounded-xl">{error}</div>
      )}

      {allowSkip && !hsDeclared && !verified && !uniDeclared && (
        <button
          type="button"
          onClick={() => onComplete(true)}
          className="text-sm font-medium text-ink-400 hover:text-ink-600 transition-colors"
        >
          Skip for now — I'll add my school later
        </button>
      )}
    </div>
  );
}
