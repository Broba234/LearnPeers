"use client";
import { useState, useEffect } from "react";

interface Province { id: string; code: string; name: string; }
interface Institution { id: string; name: string; abbreviation: string | null; type: string; }
interface Curriculum {
  id: string;
  name: string;
  kind: string;
  province: { code: string; name: string } | null;
  institution: { name: string; abbreviation: string | null } | null;
  courseCount: number;
}
interface Course { id: string; code: string; name: string; grade: number | null; category: string | null; }

const KIND_LABEL: Record<string, string> = {
  provincial_secondary: "Provincial (high school)",
  ib: "IB (global)",
  ap: "AP (global)",
  university: "University",
};

export default function CurriculaPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New curriculum form
  const [showCurForm, setShowCurForm] = useState(false);
  const [curName, setCurName] = useState("");
  const [curKind, setCurKind] = useState("provincial_secondary");
  const [curProvince, setCurProvince] = useState("");
  const [curInstitution, setCurInstitution] = useState("");
  const [curError, setCurError] = useState<string | null>(null);

  // Course forms
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [cCode, setCCode] = useState("");
  const [cName, setCName] = useState("");
  const [cGrade, setCGrade] = useState("");
  const [cCategory, setCCategory] = useState("");
  const [courseError, setCourseError] = useState<string | null>(null);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const loadCurricula = () =>
    fetch("/api/curricula").then((r) => r.json()).then((d) => setCurricula(Array.isArray(d) ? d : []));

  useEffect(() => {
    Promise.all([
      fetch("/api/curricula").then((r) => r.json()),
      fetch("/api/provinces").then((r) => r.json()),
      fetch("/api/institutions?type=university").then((r) => r.json()),
    ]).then(([cur, prov, inst]) => {
      setCurricula(Array.isArray(cur) ? cur : []);
      setProvinces(Array.isArray(prov) ? prov : []);
      setInstitutions(Array.isArray(inst) ? inst : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    fetch(`/api/curricula/${active}/courses`).then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []));
  }, [active]);

  const selected = curricula.find((c) => c.id === active);

  const addCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurError(null);
    try {
      const res = await fetch("/api/curricula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: curName,
          kind: curKind,
          province_id: curKind === "provincial_secondary" ? curProvince : undefined,
          institution_id: curKind === "university" ? curInstitution : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCurName(""); setCurProvince(""); setCurInstitution("");
      setShowCurForm(false);
      loadCurricula();
    } catch (err: any) {
      setCurError(err.message);
    }
  };

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    setCourseError(null);
    try {
      const res = await fetch(`/api/curricula/${active}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cCode, name: cName, grade: cGrade, category: cCategory }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const course = await res.json();
      setCourses((prev) => [course, ...prev]);
      setCCode(""); setCName(""); setCGrade(""); setCCategory("");
      setShowCourseForm(false);
      loadCurricula();
    } catch (err: any) {
      setCourseError(err.message);
    }
  };

  const bulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !bulkJson.trim()) return;
    setBulkResult(null);
    try {
      const parsed = JSON.parse(bulkJson);
      const res = await fetch(`/api/curricula/${active}/courses/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.isArray(parsed) ? parsed : parsed.courses),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setBulkResult(`${result.created} created, ${result.updated} updated, ${result.skipped} skipped.${result.errors?.length ? " " + result.errors.slice(0, 3).join("; ") : ""}`);
      const updated = await fetch(`/api/curricula/${active}/courses`).then((r) => r.json());
      setCourses(Array.isArray(updated) ? updated : []);
      setBulkJson("");
      loadCurricula();
    } catch (err: any) {
      setBulkResult("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Curricula & Courses</h1>
            <p className="text-gray-500 text-sm mt-1">
              Provincial high-school codes apply to every board in that province — add them once here.
            </p>
          </div>
          <button onClick={() => setShowCurForm(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">
            + Add Curriculum
          </button>
        </div>

        {showCurForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-semibold mb-4">Add Curriculum</h2>
              {curError && <p className="text-red-600 text-sm mb-3">{curError}</p>}
              <form onSubmit={addCurriculum} className="space-y-3">
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Name (e.g. BC Secondary Curriculum)" value={curName} onChange={(e) => setCurName(e.target.value)} required />
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={curKind} onChange={(e) => setCurKind(e.target.value)}>
                  {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                {curKind === "provincial_secondary" && (
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={curProvince} onChange={(e) => setCurProvince(e.target.value)} required>
                    <option value="">Select province…</option>
                    {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {curKind === "university" && (
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={curInstitution} onChange={(e) => setCurInstitution(e.target.value)} required>
                    <option value="">Select university…</option>
                    {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                )}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowCurForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                  <button type="submit" className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Curricula list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">{curricula.length} curricula</span>
              </div>
              {loading ? (
                <div className="p-6 text-sm text-gray-400">Loading…</div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                  {curricula.map((c) => (
                    <li key={c.id} onClick={() => { setActive(c.id); setShowCourseForm(false); setShowBulk(false); setBulkResult(null); }}
                      className={`px-4 py-3 cursor-pointer hover:bg-brand-50 transition ${active === c.id ? "bg-brand-50 border-l-2 border-brand-600" : ""}`}>
                      <div className="font-medium text-sm text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {KIND_LABEL[c.kind]}{c.province ? ` · ${c.province.code}` : ""} · {c.courseCount} courses
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Courses for selected curriculum */}
          <div className="lg:col-span-2">
            {!active ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                Select a curriculum to manage its course codes
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{selected?.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{courses.length} course codes</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowBulk(!showBulk); setShowCourseForm(false); }} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Bulk Import</button>
                    <button onClick={() => { setShowCourseForm(!showCourseForm); setShowBulk(false); }} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700">+ Add Course</button>
                  </div>
                </div>

                {showCourseForm && (
                  <form onSubmit={addCourse} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                    {courseError && <p className="text-red-600 text-xs">{courseError}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Code (e.g. SBI4U)" value={cCode} onChange={(e) => setCCode(e.target.value)} required />
                      <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Title (e.g. Biology, Grade 12)" value={cName} onChange={(e) => setCName(e.target.value)} required />
                      <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Grade (optional)" value={cGrade} onChange={(e) => setCGrade(e.target.value)} />
                      <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Category (e.g. Science)" value={cCategory} onChange={(e) => setCCategory(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowCourseForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-xs">Cancel</button>
                      <button type="submit" className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-xs font-medium">Add</button>
                    </div>
                  </form>
                )}

                {showBulk && (
                  <form onSubmit={bulkImport} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                    <p className="text-xs text-gray-400">Paste JSON: <code>{`[{"code":"SBI4U","name":"Biology, Grade 12","grade":12,"category":"Science"}]`}</code></p>
                    <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono h-32" placeholder='[{"code":"...","name":"..."}]' value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} />
                    {bulkResult && <p className="text-xs text-brand-700 bg-brand-50 rounded-lg px-3 py-2">{bulkResult}</p>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setShowBulk(false); setBulkResult(null); }} className="flex-1 border border-gray-200 rounded-lg py-2 text-xs">Cancel</button>
                      <button type="submit" className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-xs font-medium">Import</button>
                    </div>
                  </form>
                )}

                {courses.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No courses yet — add one or bulk import.</p>
                ) : (
                  <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="text-xs text-gray-400 border-b border-gray-100">
                          <th className="text-left py-2 pr-4 font-medium">Code</th>
                          <th className="text-left py-2 pr-4 font-medium">Title</th>
                          <th className="text-left py-2 pr-4 font-medium">Grade</th>
                          <th className="text-left py-2 font-medium">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {courses.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-2.5 pr-4 font-mono text-brand-700 font-medium">{c.code}</td>
                            <td className="py-2.5 pr-4 text-gray-700">{c.name}</td>
                            <td className="py-2.5 pr-4 text-gray-500">{c.grade ?? "—"}</td>
                            <td className="py-2.5 text-gray-500">{c.category ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
