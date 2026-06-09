"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AddSubject from "@/components/admin/AddSubject";

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

export default function SubjectsPage() {
  const router = useRouter();
  
  // State for form inputs
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | "">("");
  const [selectedCategory, setSelectedCategory] = useState<string | "">("");
  const [showAddSubject, setShowAddSubject] = useState(false);
  // State for data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch subjects and extract grades & categories
  useEffect(() => {
    const fetchSubjectsAndExtractData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch("/api/subjects");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch subjects: ${response.statusText}`);
        }
        
        const subjectsData: Subject[] = await response.json();
        setSubjects(subjectsData);
        
        if (Array.isArray(subjectsData)) {
          // Extract unique grades
          const uniqueGrades = new Set<number>();
          const uniqueCategories = new Set<string>();
          
          subjectsData.forEach((subject: Subject) => {
            uniqueGrades.add(subject.grade);
            uniqueCategories.add(subject.category);
          });
          
          // Convert to arrays with proper formatting
          const gradeOptions: GradeOption[] = Array.from(uniqueGrades)
            .sort((a, b) => a - b)
            .map(grade => ({
              id: grade,
              name: grade >= 1 && grade <= 4 ? `Year ${grade}` : `Grade ${grade}`
            }));
          
          const categoryOptions: CategoryOption[] = Array.from(uniqueCategories)
            .sort()
            .map(category => ({
              id: category,
              name: category
            }));
          
          setGrades(gradeOptions);
          setCategories(categoryOptions);
          
        } else {
          setError("Invalid data format received from server");
        }
      } catch (err) {
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectsAndExtractData();
  }, []);

  // Format date function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter subjects based on search term and filters
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = searchTerm === "" || 
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGrade = selectedGradeFilter === "all" || 
      subject.grade.toString() === selectedGradeFilter;
    
    const matchesCategory = selectedCategoryFilter === "all" || 
      subject.category === selectedCategoryFilter;
    
    return matchesSearch && matchesGrade && matchesCategory;
  });

  // Get unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(subjects.map(subject => subject.category)));

  // Get unique grades for filter dropdown
  const uniqueGrades = Array.from(new Set(subjects.map(subject => subject.grade.toString())));

  // Pagination logic
  const indexOfLastSubject = currentPage * itemsPerPage;
  const indexOfFirstSubject = indexOfLastSubject - itemsPerPage;
  const currentSubjects = filteredSubjects.slice(indexOfFirstSubject, indexOfLastSubject);
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Handle create subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!subjectName || !subjectCode || !selectedGrade || !selectedCategory) {
      setError("Please fill in all fields");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/subjects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: subjectName.trim(),
          code: subjectCode.trim().toUpperCase(),
          grade: selectedGrade as number,
          category: selectedCategory as string,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create subject: ${response.statusText}`);
      }

      const newSubject = await response.json();
      
      // Add new subject to the list
      setSubjects(prev => [newSubject, ...prev]);
      
      // Clear form
      setSubjectName("");
      setSubjectCode("");
      setSelectedGrade("");
      setSelectedCategory("");
      
      setSuccess("Subject created successfully!");
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete subject
  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) {
      return;
    }

    try {
      const response = await fetch("/api/subjects/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subjectId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete subject: ${response.statusText}`);
      }

      // Remove subject from the list
      setSubjects(prev => prev.filter(subject => subject.id !== subjectId));
      
      setSuccess("Subject deleted successfully!");
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subject");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedGradeFilter("all");
    setSelectedCategoryFilter("all");
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                All Subjects
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View and manage all subjects
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total: {filteredSubjects.length} subjects
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddSubject(true)} className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Subject
              </button>
            </div>
          </div>
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
          <div className="mb-6 p-4 bg-gradient-to-b from-[#F8F9FD] to-gray-400 border border-blue-200 dark:border-blue-800 rounded-lg">
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

        {/* Filters Section */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Subjects
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, code, category..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 outline-none"
            />
          </div>
          
          <div>
            <label htmlFor="grade-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Grade
            </label>
            <select
              id="grade-filter"
              value={selectedGradeFilter}
              onChange={(e) => {
                setSelectedGradeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 outline-none"
            >
              <option value="all">All Levels</option>
              {uniqueGrades.sort((a, b) => parseInt(a) - parseInt(b)).map(grade => (
                <option key={grade} value={grade}>
                  {parseInt(grade) >= 1 && parseInt(grade) <= 4 ? `Year ${grade}` : `Grade ${grade}`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Category
            </label>
            <select
              id="category-filter"
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 outline-none"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.sort().map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subject Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Code & Grade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentSubjects.length > 0 ? (
                  currentSubjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-300 font-medium">
                                {subject.name?.charAt(0).toUpperCase() || 'S'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {subject.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {subject.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          Code: <span className="font-mono">{subject.code}</span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {subject.grade >= 1 && subject.grade <= 4 ? `Year ${subject.grade}` : `Grade ${subject.grade}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subject.category === 'Science' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : subject.category === 'Mathematics'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : subject.category === 'Languages'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                            : subject.category === 'Arts'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}>
                          {subject.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div>Created: {formatDate(subject.created_at)}</div>
                        <div>Updated: {formatDate(subject.updated_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteSubject(subject.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-500 dark:text-gray-400">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="mt-4 text-lg font-medium">No subjects found</p>
                        <p className="mt-2">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredSubjects.length > 0 && (
          <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{indexOfFirstSubject + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastSubject, filteredSubjects.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredSubjects.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-600 text-blue-600 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                      currentPage === totalPages
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Create Subject Form */}
        {/* <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Create New Subject
          </h2>
          <form onSubmit={handleCreateSubject}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="subject-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject Name *
                </label>
                <input
                  type="text"
                  id="subject-name"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Enter subject name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="subject-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject Code *
                </label>
                <input
                  type="text"
                  id="subject-code"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="Enter subject code (e.g., MATH101)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grade *
                </label>
                <select
                  id="grade"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value ? parseInt(e.target.value) : "")}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 outline-none"
                  required
                >
                  <option value="">Select Grade</option>
                  {grades.map(grade => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 outline-none"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors ${
                  submitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Subject'
                )}
              </button>
            </div>
          </form>
        </div> */}
      </div>
    </div>
    {showAddSubject && <AddSubject subjects={subjects} setSubjects={setSubjects} grades={grades} categories={categories} setShowAddSubject={setShowAddSubject} />} 
    </div>
  );
}