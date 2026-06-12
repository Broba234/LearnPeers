"use client";
import { useState, useEffect } from "react";

interface Institution {
  id: string;
  name: string;
  abbreviation: string | null;
  country: string;
  province: string | null;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  category: string | null;
}

interface InstitutionCourse {
  id: string;
  institution_id: string;
  subject_id: string;
  code: string;
  name: string | null;
  Institutions: { name: string; abbreviation: string | null };
  Subjects: { name: string; category: string | null };
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInstitution, setActiveInstitution] = useState<string | null>(null);

  // Institution form
  const [instName, setInstName] = useState("");
  const [instAbbr, setInstAbbr] = useState("");
  const [instProvince, setInstProvince] = useState("");
  const [instCountry, setInstCountry] = useState("Canada");
  const [instError, setInstError] = useState<string | null>(null);
  const [instSubmitting, setInstSubmitting] = useState(false);
  const [showInstForm, setShowInstForm] = useState(false);

  // Course form
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseSubjectId, setCourseSubjectId] = useState("");
  const [courseError, setCourseError] = useState<string | null>(null);
  const [courseSubmitting, setCourseSubmitting] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);

  // Bulk import
  const [bulkJson, setBulkJson] = useState("");
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/institutions").then(r => r.json()),
      fetch("/api/subjects").then(r => r.json()),
    ]).then(([insts, subjs]) => {
      setInstitutions(Array.isArray(insts) ? insts : []);
      setSubjects(Array.isArray(subjs) ? subjs : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeInstitution) return;
    fetch(`/api/institution-courses?institution_id=${activeInstitution}`)
      .then(r => r.json())
      .then(data => setCourses(Array.isArray(data) ? data : []));
  }, [activeInstitution]);

  const handleAddInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName.trim()) return;
    setInstSubmitting(true);
    setInstError(null);
    try {
      const res = await fetch("/api/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: instName, abbreviation: instAbbr, country: instCountry, province: instProvince }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const inst = await res.json();
      setInstitutions(prev => [inst, ...prev]);
      setInstName(""); setInstAbbr(""); setInstProvince(""); setInstCountry("Canada");
      setShowInstForm(false);
    } catch (err: any) {
      setInstError(err.message);
    } finally {
      setInstSubmitting(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInstitution || !courseCode || !courseSubjectId) return;
    setCourseSubmitting(true);
    setCourseError(null);
    try {
      const res = await fetch("/api/institution-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution_id: activeInstitution, subject_id: courseSubjectId, code: courseCode, name: courseName }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const course = await res.json();
      setCourses(prev => [course, ...prev]);
      setCourseCode(""); setCourseName(""); setCourseSubjectId("");
      setShowCourseForm(false);
    } catch (err: any) {
      setCourseError(err.message);
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInstitution || !bulkJson.trim()) return;
    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const parsed = JSON.parse(bulkJson);
      const courses = Array.isArray(parsed) ? parsed : parsed.courses;
      const res = await fetch("/api/institution-courses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution_id: activeInstitution, courses }),
      });
      const result = await res.json();
      setBulkResult(`Done: ${result.created} imported, ${result.skipped} skipped.${result.errors?.length ? ' Errors: ' + result.errors.join('; ') : ''}`);
      // Refresh courses list
      const updated = await fetch(`/api/institution-courses?institution_id=${activeInstitution}`).then(r => r.json());
      setCourses(Array.isArray(updated) ? updated : []);
      setBulkJson("");
    } catch (err: any) {
      setBulkResult("Error: " + err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const selectedInst = institutions.find(i => i.id === activeInstitution);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Institutions</h1>
            <p className="text-gray-500 text-sm mt-1">Manage universities and their course codes</p>
          </div>
          <button
            onClick={() => setShowInstForm(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            + Add Institution
          </button>
        </div>

        {/* Add Institution Modal */}
        {showInstForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-semibold mb-4">Add Institution</h2>
              {instError && <p className="text-red-600 text-sm mb-3">{instError}</p>}
              <form onSubmit={handleAddInstitution} className="space-y-3">
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Name (e.g. McGill University)" value={instName} onChange={e => setInstName(e.target.value)} required />
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Abbreviation (e.g. McGill)" value={instAbbr} onChange={e => setInstAbbr(e.target.value)} />
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Province (e.g. Quebec)" value={instProvince} onChange={e => setInstProvince(e.target.value)} />
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Country" value={instCountry} onChange={e => setInstCountry(e.target.value)} />
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowInstForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                  <button type="submit" disabled={instSubmitting} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                    {instSubmitting ? "Saving..." : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: institution list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">{institutions.length} institutions</span>
              </div>
              {loading ? (
                <div className="p-6 text-sm text-gray-400">Loading...</div>
              ) : institutions.length === 0 ? (
                <div className="p-6 text-sm text-gray-400">No institutions yet.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {institutions.map(inst => (
                    <li
                      key={inst.id}
                      onClick={() => { setActiveInstitution(inst.id); setShowCourseForm(false); setShowBulk(false); setBulkResult(null); }}
                      className={`px-4 py-3 cursor-pointer hover:bg-brand-50 transition ${activeInstitution === inst.id ? "bg-brand-50 border-l-2 border-brand-600" : ""}`}
                    >
                      <div className="font-medium text-sm text-gray-900">{inst.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{inst.abbreviation}{inst.province ? ` · ${inst.province}` : ""}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: courses for selected institution */}
          <div className="lg:col-span-2">
            {!activeInstitution ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                Select an institution to manage its course codes
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{selectedInst?.name}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{courses.length} courses mapped</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowBulk(!showBulk); setShowCourseForm(false); }} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Bulk Import
                      </button>
                      <button onClick={() => { setShowCourseForm(!showCourseForm); setShowBulk(false); }} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
                        + Add Course
                      </button>
                    </div>
                  </div>

                  {/* Add Course inline form */}
                  {showCourseForm && (
                    <form onSubmit={handleAddCourse} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Add Course Code</h3>
                      {courseError && <p className="text-red-600 text-xs">{courseError}</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Code (e.g. MATH 140)" value={courseCode} onChange={e => setCourseCode(e.target.value)} required />
                        <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Course title (optional)" value={courseName} onChange={e => setCourseName(e.target.value)} />
                      </div>
                      <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={courseSubjectId} onChange={e => setCourseSubjectId(e.target.value)} required>
                        <option value="">Select canonical subject →</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}{s.category ? ` (${s.category})` : ""}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowCourseForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-xs">Cancel</button>
                        <button type="submit" disabled={courseSubmitting} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-xs font-medium disabled:opacity-50">
                          {courseSubmitting ? "Saving..." : "Add"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Bulk import */}
                  {showBulk && (
                    <form onSubmit={handleBulkImport} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Bulk Import</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Paste a JSON array: <code>[{`{"subject_id":"...","code":"MATH 140","name":"Calculus"}`}]</code></p>
                      </div>
                      <textarea
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono h-32"
                        placeholder='[{"subject_id": "uuid", "code": "MATH 140", "name": "Honours Calculus"}]'
                        value={bulkJson}
                        onChange={e => setBulkJson(e.target.value)}
                      />
                      {bulkResult && <p className="text-xs text-brand-700 bg-brand-50 rounded-lg px-3 py-2">{bulkResult}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setShowBulk(false); setBulkResult(null); }} className="flex-1 border border-gray-200 rounded-lg py-2 text-xs">Cancel</button>
                        <button type="submit" disabled={bulkSubmitting} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-xs font-medium disabled:opacity-50">
                          {bulkSubmitting ? "Importing..." : "Import"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Courses table */}
                  {courses.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No courses yet — add one above or bulk import.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 border-b border-gray-100">
                            <th className="text-left py-2 pr-4 font-medium">Code</th>
                            <th className="text-left py-2 pr-4 font-medium">Course Name</th>
                            <th className="text-left py-2 font-medium">Maps to</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {courses.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50">
                              <td className="py-2.5 pr-4 font-mono text-brand-700 font-medium">{c.code}</td>
                              <td className="py-2.5 pr-4 text-gray-700">{c.name || <span className="text-gray-300">—</span>}</td>
                              <td className="py-2.5 text-gray-500">{c.Subjects?.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
