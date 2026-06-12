"use client";

export default function SearchForm() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="justify-center items-center gap-x-3 sm:flex"
    >
      <input
        type="text"
        placeholder="What subject do you want to learn?"
        className="w-full px-3 py-2.5 text-gray-600 bg-gray-50 focus:bg-white duration-150 outline-none rounded-lg shadow-sm border border-gray-200 sm:max-w-sm sm:w-auto"
      />
      <button className="flex items-center justify-center gap-x-2 py-2.5 px-4 mt-3 w-full text-sm text-white font-medium bg-gradient-to-r from-[#1089d3] to-[#12B1D1] hover:bg-brand-700 active:bg-brand-800 duration-150 rounded-lg sm:mt-0 sm:w-auto">
        Find Tutors
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clipRule="evenodd" />
        </svg>
      </button>
    </form>
  );
} 