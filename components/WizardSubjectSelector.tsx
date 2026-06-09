import React, { useState } from "react";
export type Subjects = {
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

export const WizardSubjectSelector = ({ 
  categories, 
  value, 
  grade, 
  selectedSubjects, 
  onSubjectClick,
  onChange 
}: any) => {
  const [selectedCategories, setSelectedCategories] = useState<CategoryGroup[]>(
    []
  );


  const handleCategoryClick = (categoryName: any) => {
    setSelectedCategories(
      (prev: any) =>
        prev.includes(categoryName)
          ? [] // Remove all if clicking the same category
          : [categoryName] // Replace with new single selection
    );
  };



  return (
    <div className="space-y-4">
      {/* Main Select Div with Selected Subjects Display */}
      {/* Category Selection */}
      <div>
  <label className="block text-sm font-medium text-white mb-2">
    Filter by level
  </label>
  <select
    name="grade"
    value={grade}
    onChange={(e) => onChange(e)}
    className="w-full px-4 py-3 text-white bg-gradient-to-r from-gray-800 to-gray-900 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none hover:from-gray-700 hover:to-gray-800"
  >
    <option value="" className="text-gray-300 bg-gray-800">All levels</option>
    <optgroup label="High School" className="bg-gray-800">
      <option value="9" className="text-white bg-gray-800">Grade 9</option>
      <option value="10" className="text-white bg-gray-800">Grade 10</option>
      <option value="11" className="text-white bg-gray-800">Grade 11</option>
      <option value="12" className="text-white bg-gray-800">Grade 12</option>
    </optgroup>
    <optgroup label="Post-Secondary" className="bg-gray-800">
      <option value="1" className="text-white bg-gray-800">Year 1</option>
      <option value="2" className="text-white bg-gray-800">Year 2</option>
      <option value="3" className="text-white bg-gray-800">Year 3</option>
      <option value="4" className="text-white bg-gray-800">Year 4</option>
    </optgroup>
  </select>
</div>
      <div className="relative">
        <label className="block text-sm font-medium text-white mb-2">
          Select Subjects *
        </label>

        {/* Selected Subjects Preview */}
        <div className="mb-2 min-h-[40px] p-2 border border-gray-300 rounded-lg">
          {selectedSubjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedSubjects.map((subject: Subjects) => (
                <div
                  key={subject.id}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                >
                  {subject.name} ({subject.code})
                  <button
                    type="button"
                    onClick={() => onSubjectClick(subject)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">
              No subjects selected. Click below to select categories.
            </div>
          )}
        </div>

        <div className="border border-gray-300 rounded-lg p-4">
          <div className="mb-3 text-sm font-medium text-white">
            Select Subject:
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat: any) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryClick(cat.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategories.includes(cat.name)
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {cat.name}
                {selectedCategories.includes(cat.name) && (
                  <span className="ml-1 bg-white text-blue-600 rounded-full w-4 h-4 inline-flex items-center justify-center text-xs">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subjects Dropdown from Selected Categories */}
      <div>
        {selectedCategories.length > 0 && (
          <div className="border border-gray-300 rounded-lg p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium text-white">
              Select Subjects from category(ies):
            </div>

            <div className="space-y-4">
              {categories
                .filter((cat: any) => selectedCategories.includes(cat.name))
                .map((cat: any) => (
                  <div
                    key={cat.name}
                    className=" rounded-lg p-3"
                  >
                    <div className="font-medium text-white mb-2">
                      {cat.name} Subjects:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cat.subjects.map((subject: any) => {
                        const isSelected = selectedSubjects.some(
                          (s:any) => s.id === subject.id
                        );
                        return (
                          <button
                            key={subject.id}
                            type="button"
                            onClick={() => onSubjectClick(subject)}
                            className={`px-3 py-1 rounded-full border text-sm transition-all duration-200 flex items-center gap-1 ${
                              isSelected
                                ? "bg-gradient-to-r from-green-500 to-green-600 text-white border-transparent"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            {subject.name} ({subject.code})
                            <span className="ml-1 text-xs text-gray-500">
                              {subject.grade >= 1 && subject.grade <= 4 ? `Y${subject.grade}` : `G${subject.grade}`}
                            </span>
                            {isSelected && (
                              <svg
                                className="w-4 h-4 ml-1 text-white"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// How to use it in your form:
{
  /*
  Replace your existing subject select with:
  
  <SubjectSelector
    categories={categories}
    value={formData.subjects || []}
    onChange={(selected) => setFormData(prev => ({ ...prev, subjects: selected }))}
  />
*/
}
