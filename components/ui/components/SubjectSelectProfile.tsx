import { useState, useEffect } from "react";
import {
  BookOpen,
  Calculator,
  Microscope,
  Landmark,
  Monitor,
  MessageCircle,
  X,
  CheckCircle,
  XCircle,
  Briefcase,
  Heart,
  Palette,
  Users,
  Search,
} from "lucide-react";

type SubjectKey = string;

// Icon mapping for different categories
const CATEGORY_ICONS: Record<string, any> = {
  Business: Briefcase,
  English: BookOpen,
  French: MessageCircle,
  "Health and Phys Ed": Heart,
  Mathematics: Calculator,
  Science: Microscope,
  "Social Sciences": Users,
  "The Arts": Palette,
};

// Color mapping for different categories
const CATEGORY_COLORS: Record<string, string> = {
  Business: "from-brand-500 to-brand-500",
  English: "from-brand-500 to-brand-500",
  French: "from-rose-500 to-brand-500",
  "Health and Phys Ed": "from-emerald-500 to-teal-500",
  Mathematics: "from-brand-500 to-brand-500",
  Science: "from-brand-500 to-brand-500",
  "Social Sciences": "from-yellow-500 to-orange-500",
  "The Arts": "from-brand-500 to-brand-500",
};

interface SelectSubjectProps {
  categories?: Array<{
    name: string;
    subjects: Array<{
      id: string;
      name: string;
      code: string;
      grade?: number;
    }>;
  }>;
  selectedSubjects?: Array<{
    id: string;
    name: string;
    code: string;
    grade?: number;
  }>;
  onSubjectsChange?: (
    subjects: Array<{
      id: string;
      name: string;
      code: string;
      grade?: number;
    }>
  ) => void;
}

export default function SubjectSelectProfile({
  categories,
  selectedSubjects: initialSelectedSubjects = [],
  onSubjectsChange,
}: SelectSubjectProps) {
  const [activeSubject, setActiveSubject] = useState<SubjectKey | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<
    Array<{
      id: string;
      name: string;
      code: string;
      grade?: number;
    }>
  >(initialSelectedSubjects);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Group selected subjects by category for display
  const getSelectedSubjectsByCategory = () => {
    const grouped: Record<string, any[]> = {};

    selectedSubjects.forEach((subject) => {
      // Find which category this subject belongs to
      const category = categories.find((cat) =>
        cat.subjects.some((s) => s.id === subject.id || s.name === subject.name)
      );

      if (category) {
        if (!grouped[category.name]) {
          grouped[category.name] = [];
        }
        grouped[category.name].push(subject);
      }
    });

    return grouped;
  };
  const toggleSubject = (subject: {
    id: string;
    name: string;
    code: string;
    grade?: number;
  }) => {
    let newSubjects = null;
    setSelectedSubjects((prev) => {
      const isAlreadySelected = prev.some((s) => s.id === subject.id);

      if (isAlreadySelected) {
        newSubjects = prev.filter((s) => s.id !== subject.id);
      } else {
        newSubjects = [...prev, subject];
      }
      if (onSubjectsChange) {
        onSubjectsChange(newSubjects || []);
      }
      return newSubjects;
    });
  };

  const removeSubject = (subjectId: string) => {
    let newSubjects = null;
    setSelectedSubjects((prev) => {
      newSubjects = prev.filter((s) => s.id !== subjectId);
      return newSubjects;
    });
    if (onSubjectsChange) {
      onSubjectsChange(newSubjects || []);
    }
  };

  const removeAllSubjectsFromCategory = (categoryName: string) => {
    setSelectedSubjects((prev) => {
      // Get all subject IDs from this category
      const category = categories.find((c) => c.name === categoryName);
      if (!category) return prev;

      const categorySubjectIds = category.subjects.map((s) => s.id);
      const newSubjects = prev.filter(
        (s) => !categorySubjectIds.includes(s.id)
      );

      if (onSubjectsChange) {
        onSubjectsChange(newSubjects);
      }

      return newSubjects;
    });
  };

  // Get icon for category
  const getIconForCategory = (categoryName: string) => {
    return CATEGORY_ICONS[categoryName] || BookOpen;
  };

  // Get color for category
  const getColorForCategory = (categoryName: string) => {
    return CATEGORY_COLORS[categoryName] || "from-gray-500 to-gray-700";
  };

  // Check if a subject is selected
  const isSubjectSelected = (subjectId: string) => {
    return selectedSubjects.some((s) => s.id === subjectId);
  };

  // Get selected count for a category
  const getSelectedCountForCategory = (categoryName: string) => {
    const category = categories.find((c) => c.name === categoryName);
    if (!category) return 0;

    return selectedSubjects.filter((s) =>
      category.subjects.some((cs) => cs.id === s.id)
    ).length;
  };

  // Search functionality - get all matching subjects across all categories
  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: Array<{
      subject: { id: string; name: string; code: string; grade?: number };
      categoryName: string;
      color: string;
      icon: any;
    }> = [];

    categories.forEach(category => {
      category.subjects.forEach(subject => {
        if (
          subject.name.toLowerCase().includes(query) ||
          subject.code.toLowerCase().includes(query)
        ) {
          results.push({
            subject,
            categoryName: category.name,
            color: getColorForCategory(category.name),
            icon: getIconForCategory(category.name),
          });
        }
      });
    });

    return results;
  };

  const selectedByCategory = getSelectedSubjectsByCategory();
  const gradeLabel = (n: number) => (n >= 1 && n <= 4 ? `Year ${n}` : `Grade ${n}`);
  const GRADES = [9, 10, 11, 12, 1, 2, 3, 4];
  const searchResults = getSearchResults();
  return (
   <div className="space-y-8">
  {/* Search Input */}
  <div className="relative group">
    <label className="block text-sm font-medium text-gray-900 mb-2">
      Search Subjects
    </label>
    <div className="relative">
      <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
      <div className="relative bg-white rounded-2xl border-2 border-gray-200 p-[2px] transition-all duration-300 hover:border-brand-300 group-focus-within:border-brand-400 group-focus-within:shadow-lg group-focus-within:shadow-brand-100">
        <div className="flex items-center">
          <div className="pl-4 text-gray-400">
            <Search size={18} />
          </div>
          <div className="flex-1 px-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject name or code..."
              className="w-full py-2 px-0 border-0 focus:ring-0 focus:outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-transparent"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="pr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      <div className="absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent opacity-50" />
    </div>
  </div>

  <div className="relative group">
    <label className="block text-sm font-medium text-gray-900 mb-2">
      Select Grade
    </label>
    <div className="relative">
      <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
      <div className="relative bg-white rounded-2xl border-2 border-gray-200 p-[2px] transition-all duration-300 hover:border-brand-300 group-focus-within:border-brand-400 group-focus-within:shadow-lg group-focus-within:shadow-brand-100">
        <div className="flex items-center">
          <div className="flex-1 px-4">
            <select
              value={gradeFilter || ""}
              onChange={(e: any) => setGradeFilter(e.target.value || null)}
              className="w-full py-2 px-0 border-0 focus:ring-0 focus:outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-transparent"
            >
              <option value="">All Levels</option>
              <optgroup label="High School">
                {[9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </optgroup>
              <optgroup label="Post-Secondary">
                {[1, 2, 3, 4].map(g => <option key={g} value={g}>Year {g}</option>)}
              </optgroup>
            </select>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent opacity-50" />
    </div>
  </div>

  {/* Selected Subjects Display */}
  {Object.keys(selectedByCategory).length > 0 && (
    <div className="">
      <div className="gap-3 flex items-center flex-wrap">
        {Object.entries(selectedByCategory).map(
          ([categoryName, subjects]) => {
            const Icon = getIconForCategory(categoryName);
            const color = getColorForCategory(categoryName);

            return (
              <div
                key={categoryName}
                className="border border-gray-300 flex-1 rounded-xl p-2 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-lg bg-gradient-to-br ${color} text-white flex items-center justify-center`}
                    >
                      {Icon && <Icon size={18} />}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {categoryName}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      removeAllSubjectsFromCategory(categoryName)
                    }
                    className="text-gray-500 hover:text-gray-700"
                    title="Remove all subjects from this category"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="inline-flex items-center gap-2 bg-brand-100 text-brand-800 px-3 py-1 rounded-lg text-sm"
                    >
                      <CheckCircle size={14} className="text-brand-600" />
                      <span className="text-[10px]">{subject.name}</span>
                      {subject.code && (
                        <span className="text-xs text-brand-600 ml-1">
                          ({subject.code})
                        </span>
                      )}
                      <button
                        onClick={() => removeSubject(subject.id)}
                        className="text-brand-500 hover:text-brand-700 ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  )}

  {/* Search Results - Show when search query is present */}
  {searchQuery.trim() && (
    <div className="bg-white border border-gray-300 rounded-2xl shadow-md p-2 ">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Search Results {searchResults.length > 0 && `(${searchResults.length})`}
      </h3>
      
      {searchResults.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No subjects found matching &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto scrollbar-hide">
          {searchResults.map(({ subject, categoryName, color, icon: Icon }) => {
            const selected = isSubjectSelected(subject.id);
            
            return (
              <button
                key={subject.id}
                onClick={() => toggleSubject(subject)}
                className={`rounded-xl border p-3 text-sm transition-all ${
                  selected
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-gray-300 hover:border-gray-400 hover:shadow-sm hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                <span className={`text-xs ${selected ? 'text-brand-200' : 'text-gray-500'}`}>
                    {categoryName}
                  </span>
                 <div>
                 <span className={` font-medium text-[10px] ${selected ? 'text-white' : 'text-gray-900'}`}>
                    {subject.name} ({subject.code})
                  </span>
                 </div>

                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  )}

  {/* Category Selection Grid - Show when search is empty */}
  {!searchQuery.trim() && (
    <div
      className={`w-full ${
        Object.keys(selectedByCategory).length > 0 ? "" : "mt-12"
      } h-full grid grid-cols-12 gap-8`}
    >
      <main className="col-span-12">
        <div className="grid grid-cols-2 gap-4 relative">
          {categories.map((category, index) => {
          const Icon = getIconForCategory(category.name);
          const color = getColorForCategory(category.name);
          const isActive = activeSubject === category.name;
          const selectedCount = getSelectedCountForCategory(category.name);
          // Calculate column position for panel alignment
          const columnPosition = (index % 3) + 1;
          const panelPosition =
            columnPosition === 3
              ? "right"
              : columnPosition === 2
              ? "center"
              : "left";

          return (
            <div key={category.name} className="relative">
              <button
                onClick={() =>
                  setActiveSubject(isActive ? null : category.name)
                }
                className={`relative rounded-2xl border border-gray-300 p-2 flex items-center gap-4 transition-all w-full
                ${
                  isActive
                    ? "border-brand-500 bg-brand-50"
                    : selectedCount > 0
                    ? "border-brand-300 bg-brand-50"
                    : "hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center relative`}
                >
                  <Icon size={15} />
                  {selectedCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-xs text-white">
                      {selectedCount}
                    </div>
                  )}
                </div>
                <span className={`${isActive ? "text-gray-900" : "text-gray-900"} font-sm text-[10px]`}>
                  {category.name}
                </span>
              </button>

              {/* Subcategory Panel - Positioned under the active category */}
              {isActive && (
                <div
                  className={`absolute top-full z-10 mt-3 ${
                    panelPosition === "right"
                      ? "right-0"
                      : panelPosition === "center"
                      ? "left-1/2 transform -translate-x-1/2"
                      : "left-0"
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`absolute -top-2 w-4 h-4 bg-white border-l border-t border-gray-300 transform rotate-45 ${
                        panelPosition === "right"
                          ? "right-6 left-auto"
                          : panelPosition === "center"
                          ? "left-1/2 transform -translate-x-1/2"
                          : "left-6"
                      }`}
                    ></div>

                    <div className="bg-white border border-gray-300 rounded-2xl shadow-xl p-2 w-80">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {category.name}
                        </h3>
                        <button
                          onClick={() => setActiveSubject(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {category.subjects
                          .filter((subject) => {
                            // If no grade filter, show all
                            if (!gradeFilter || gradeFilter === null) return true;
                            
                            // Compare grade values properly
                            // Assuming subject.grade is a string like "1", "2", etc.
                            return subject.grade == gradeFilter;
                          })
                          .map((subject) => {
                            const selected = isSubjectSelected(subject.id);

                            return (
                              <button
                                key={subject.id}
                                onClick={() => toggleSubject(subject)}
                                className={`rounded-xl border px-1 py-2 text-sm transition gap-2 ${
                                  selected
                                    ? "bg-brand-600 text-white border-brand-600"
                                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center">
                                  <span className="block text-[10px] text-gray-900">
                                    {subject.name}
                                  </span>
                                  <span className="text-[10px] text-gray-700 rounded-lg px-[15px] bg-gray-200">
                                    {subject.code}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </main>
    </div>
  )}
</div>
  );
}
