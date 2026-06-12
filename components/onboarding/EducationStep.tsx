"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, GraduationCap, School, Mail, Loader2 } from "lucide-react";

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

export default function EducationStep({ requireVerification, allowSkip, onComplete }: Props) {
  const [level, setLevel] = useState<"high_school" | "university" | null>(null);
  const [universities, setUniversities] = useState<Institution[]>([]);
  const [boards, setBoards] = useState<Institution[]>([]);

  // High school path
  const [boardId, setBoardId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [hsDeclared, setHsDeclared] = useState(false);

  // University path
  const [universityId, setUniversityId] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [uniDeclared, setUniDeclared] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedUniversity = universities.find((u) => u.id === universityId);

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
    else if (level === "university") onComplete(requireVerification ? verified : uniDeclared);
    else onComplete(false);
  }, [level, hsDeclared, verified, uniDeclared, requireVerification, onComplete]);

  const declareHighSchool = async () => {
    if (!schoolName.trim()) {
      setError("Enter your school's name");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/education/declare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "current_high_school",
          institutionId: boardId || undefined,
          institutionName: schoolName.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not save your school");
      setHsDeclared(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

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
      {/* Level selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { key: "high_school" as const, label: "High school", sub: "I'm in grades 9–12", icon: <School className="w-6 h-6" /> },
          { key: "university" as const, label: "University", sub: "I'm a post-secondary student", icon: <GraduationCap className="w-6 h-6" /> },
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

      {/* High school details */}
      {level === "high_school" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {hsDeclared ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">{schoolName}</p>
                <p className="text-sm text-green-700">
                  Saved. You can add proof of enrollment later from your profile.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">School board (optional)</label>
                <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className={inputClass}>
                  <option value="">Select your school board…</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.abbreviation ? `(${b.abbreviation})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">School name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Northern Secondary School"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={declareHighSchool}
                disabled={busy || !schoolName.trim()}
                className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Save my school
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* University details */}
      {level === "university" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">Your university</label>
            <select
              value={universityId}
              onChange={(e) => {
                setUniversityId(e.target.value);
                setCodeSent(false);
                setVerified(false);
                setCode("");
                setDevCode(null);
                if (e.target.value) declareUniversity(e.target.value);
              }}
              className={inputClass}
            >
              <option value="">Select your university…</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.city ? `— ${u.city}` : ""}
                </option>
              ))}
            </select>
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
