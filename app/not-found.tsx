"use client";

import { Button } from "@/components/ui/primitives";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-ink-900 text-white text-center px-4">
            <h1 className="text-6xl font-extrabold mb-4">404</h1>
            <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
            <p className="mb-6 text-ink-300">Sorry, the page you are looking for does not exist or has been moved.</p>
            <Button href="/" size="lg" className="rounded-full">Go Home</Button>
        </div>
    );
}