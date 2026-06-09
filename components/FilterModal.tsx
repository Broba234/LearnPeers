"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, SlidersHorizontal, ChevronDown, ChevronUp, Search } from "lucide-react";

type Subjects = {
  id: string;
  name: string;
  code: string;
  grade: number;
  category?: string;
};

type CategoryGroup = {
  name: string;
  subjects: Subjects[];
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryGroup[];
  selectedSubjectIds: string[];
  onToggleSubject: (id: string) => void;
  onClearAll: () => void;
  gradeFilter: string;
  onGradeChange: (grade: string) => void;
  onlyActiveNow: boolean;
  onActiveNowChange: (active: boolean) => void;
  subjectsLoading: boolean;
}

const gradeLabel = (n: number) => (n >= 1 && n <= 4 ? `Year ${n}` : `Grade ${n}`);
const GRADES = [9, 10, 11, 12, 1, 2, 3, 4];

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedSubjectIds,
  onToggleSubject,
  onClearAll,
  gradeFilter,
  onGradeChange,
  onlyActiveNow,
  onActiveNowChange,
  subjectsLoading,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeFilterCount =
    selectedSubjectIds.length +
    (gradeFilter ? 1 : 0) +
    (onlyActiveNow ? 1 : 0);

  // Filter subjects by search query
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    subjects: cat.subjects.filter((s) => {
      const matchesGrade = gradeFilter === "" || s.grade === parseInt(gradeFilter);
      const matchesSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesSearch;
    }),
  })).filter((cat) => cat.subjects.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              {activeFilterCount > 0 && (
                <p className="text-xs text-gray-500">
                  {activeFilterCount} active filter{activeFilterCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Active Now Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-900">Active Now</p>
              <p className="text-xs text-gray-500 mt-0.5">Only show tutors currently online</p>
            </div>
            <button
              onClick={() => onActiveNowChange(!onlyActiveNow)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                onlyActiveNow ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                  onlyActiveNow ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Level</label>
            <button
              onClick={() => onGradeChange("")}
              className={`w-full mb-2 py-2 rounded-xl text-sm font-medium transition-all ${
                gradeFilter === ""
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All levels
            </button>
            <p className="text-xs text-gray-400 font-medium mb-1.5 mt-2">High School</p>
            <div className="flex gap-2 mb-2">
              {[9, 10, 11, 12].map((g) => (
                <button
                  key={g}
                  onClick={() => onGradeChange(gradeFilter === String(g) ? "" : String(g))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    gradeFilter === String(g)
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  G{g}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 font-medium mb-1.5">Post-Secondary</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((g) => (
                <button
                  key={g}
                  onClick={() => onGradeChange(gradeFilter === String(g) ? "" : String(g))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    gradeFilter === String(g)
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Y{g}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Subjects by Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Subjects</label>
            {subjectsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No subjects match your filters</p>
                {(searchQuery || gradeFilter) && (
                  <button
                    onClick={() => { setSearchQuery(""); onGradeChange(""); }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCategories.map((cat) => {
                  const isExpanded = expandedCategory === cat.name;
                  const selectedInCat = cat.subjects.filter((s) =>
                    selectedSubjectIds.includes(s.id)
                  ).length;
                  return (
                    <div key={cat.name} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900">{cat.name}</span>
                          <span className="text-xs text-gray-400">{cat.subjects.length}</span>
                          {selectedInCat > 0 && (
                            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {selectedInCat}
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-gray-50/50 grid grid-cols-2 gap-2">
                          {cat.subjects.map((subject) => {
                            const isSelected = selectedSubjectIds.includes(subject.id);
                            return (
                              <button
                                key={subject.id}
                                type="button"
                                onClick={() => onToggleSubject(subject.id)}
                                className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all text-sm ${
                                  isSelected
                                    ? "bg-blue-50 border border-blue-200 text-blue-800"
                                    : "bg-white border border-gray-200 text-gray-700 hover:border-blue-200 hover:bg-blue-50/50"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                                    isSelected
                                      ? "bg-blue-500 border-blue-500"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{subject.name}</p>
                                  <p className="text-[10px] text-gray-400">{subject.code} · G{subject.grade}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={() => { onClearAll(); onGradeChange(""); onActiveNowChange(false); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md transition-all"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
};
