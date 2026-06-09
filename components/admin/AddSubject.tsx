"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Subject {
  id: string;
  name: string;
  code: string;
  grade: number;
  category: string;
  created_at: string;
  updated_at: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface GradeOption {
  id: number;
  name: string;
}

interface CreateSubjectData {
  name: string;
  code: string;
  grade: number;
  category: string;
}

export default function AddSubject({ subjects, setSubjects, grades, categories, setShowAddSubject }: any) {
  const router = useRouter();
  
  // State for form inputs
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | "">("");
  const [selectedCategory, setSelectedCategory] = useState<string | "">("");
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!subjectName.trim()) {
      setError("Subject name is required");
      return;
    }
    
    if (!subjectCode.trim()) {
      setError("Subject code is required");
      return;
    }
    
    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }
    
    if (!selectedGrade) {
      setError("Please select a grade");
      return;
    }

    // Prepare data for API
    const subjectData: CreateSubjectData = {
      name: subjectName.trim(),
      code: subjectCode.trim().toUpperCase(),
      grade: selectedGrade as number,
      category: selectedCategory as string,
    };


    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/subjects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subjectData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Error: ${response.statusText}`);
      }
      console.log(responseData);

      // Success
      setSuccess("Subject created successfully!");
      setSubjects(prev => [responseData, ...prev]);
      setShowAddSubject(false);
      // Reset form
      setSubjectName("");
      setSubjectCode("");
      setSelectedGrade("");
      setSelectedCategory("");
      
    } catch (err) {
      console.error("Error creating subject:", err);
      setError(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen fixed flex items-center justify-center top-0 left-0 w-full bg-gray-50 dark:bg-gray-900/20 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
        <div className="min-h-full w-full flex items-center justify-center">
      <div className="max-w-2xl overflow-y-auto w-full mx-auto bg-white dark:bg-gray-900/20 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create New Subject
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add a new subject to the system by filling out the form below.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 dark:text-green-300">{success}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-800 dark:text-blue-300">
                Loading subjects data...
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Subject Name Input */}
              <div>
                <label htmlFor="subjectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject Name *
                </label>
                <input
                  type="text"
                  id="subjectName"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter subject name (e.g., Introduction to Business)"
                  disabled={submitting || loading}
                  required
                />
              </div>

              {/* Subject Code Input */}
              <div>
                <label htmlFor="subjectCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject Code *
                </label>
                <input
                  type="text"
                  id="subjectCode"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter subject code (e.g., BBI2O, BAF3M)"
                  disabled={submitting || loading}
                  required
                />
              </div>

              {/* Grade Select */}
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grade *
                </label>
                <select
                  id="grade"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={submitting || loading}
                  required
                >
                  <option value="">Select Level</option>
                  <optgroup label="High School">
                    {[9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </optgroup>
                  <optgroup label="Post-Secondary">
                    {[1, 2, 3, 4].map(g => <option key={g} value={g}>Year {g}</option>)}
                  </optgroup>
                </select>
                {!loading && grades.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {grades.length} grade{grades.length !== 1 ? 's' : ''} available from existing subjects
                  </p>
                )}
              </div>

              {/* Category Select */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={submitting || loading}
                  required
                >
                  <option value="">Select Category</option>
                  {loading ? (
                    <option value="" disabled>Loading categories...</option>
                  ) : categories.length === 0 ? (
                    <option value="" disabled>No categories available in existing subjects</option>
                  ) : (
                    categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  )}
                  {/* Option to add new category */}
                  <option value="__new__">+ Add New Category</option>
                </select>
                {!loading && categories.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} available from existing subjects
                  </p>
                )}
              </div>
              
              {/* New Category Input (shown when "Add New Category" is selected) */}
              {selectedCategory === "__new__" && (
                <div>
                  <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Category Name *
                  </label>
                  <input
                    type="text"
                    id="newCategory"
                    onChange={(e) => {
                      // This will be handled in the submit handler
                      const newCat = e.target.value.trim();
                      if (newCat) {
                        setSelectedCategory(newCat);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter new category name"
                    disabled={submitting}
                  />
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowAddSubject(false)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  "Create Subject"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}