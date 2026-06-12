"use client";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white text-center px-4">
            <h1 className="text-6xl font-extrabold mb-4">404</h1>
            <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
            <p className="mb-6 text-gray-400">Sorry, the page you are looking for does not exist or has been moved.</p>
            <a href="/" className="inline-block px-6 py-3 bg-brand-600 text-white rounded-full font-semibold hover:bg-brand-700 transition">Go Home</a>
        </div>
    );
} 