"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");
        setIsError(false);
    
        try {
            // Check localStorage for recent requests
            const lastRequestKey = `last_reset_request_${email}`;
            const lastRequestTime = localStorage.getItem(lastRequestKey);
            const currentTime = Date.now();
            
            // Prevent requests more than once every 60 seconds per email
            if (lastRequestTime && (currentTime - parseInt(lastRequestTime)) < 60000) {
                setMessage("Please wait 60 seconds before requesting another reset link.");
                setIsError(true);
                setIsLoading(false);
                return;
            }
            
            // Store current request time
            localStorage.setItem(lastRequestKey, currentTime.toString());
    
            // Supabase password reset
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });
    
            if (error) {
                const msg = error.message.toLowerCase();
                // Log raw error for debugging
                console.error("[RESET] Supabase error:", error.message, error);
                if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('rate_limit')) {
                    setMessage("Email limit reached. With default SMTP, Supabase allows only 2 auth emails/hour for the whole project. Fix: set up custom SMTP in Supabase Dashboard → Authentication → SMTP.");
                    setIsError(true);
                } else if (msg.includes('not authorized') || msg.includes('cannot be used') || msg.includes('authorized')) {
                    setMessage("This email is not authorized. With default SMTP, Supabase only sends to org team members. Add your email in Organization → Team, or set up custom SMTP (Dashboard → Auth → SMTP).");
                    setIsError(true);
                } else {
                    setMessage(error.message || "An error occurred. Please try again.");
                    setIsError(true);
                }
            } else {
                setMessage("If an account exists with this email, you will receive a password reset link.");
                setEmail("");
            }
        } catch (error: unknown) {
            
            const err = error as { message?: string };
            console.error("Reset password error:", err);
            setMessage(err.message || "An error occurred. Please try again.");
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reset your password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <p className="mt-1 text-center text-xs text-gray-500">
                        Not receiving emails? With Supabase default SMTP you need custom SMTP (Dashboard → Auth → SMTP) or your email in the org team. Local dev: check Mailpit.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sending...
                                </span>
                            ) : (
                                "Send reset link"
                            )}
                        </button>
                    </div>

                    {message && (
                        <p className={`mt-2 text-center text-sm ${isError ? "text-red-600" : "text-gray-600"}`}>
                            {message}
                        </p>
                    )}
                </form>
                
                <div className="text-center">
                    <button
                        onClick={() => router.push("/auth/login")}
                        className="text-sm text-brand-600 hover:text-brand-500"
                    >
                        Back to login
                    </button>
                </div>
            </div>
        </div>
    );
}