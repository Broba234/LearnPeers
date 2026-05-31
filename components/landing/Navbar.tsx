"use client";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
    const { scrollY } = useScroll();
    const [hidden, setHidden] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious();
        if (previous !== undefined && latest > previous && latest > 150) {
            setHidden(true);
        } else {
            setHidden(false);
        }
    });

    return (
        <>
        <motion.nav
            variants={{
                visible: { y: 0, x: "-50%" },
                hidden: { y: "-150%", x: "-50%" },
            }}
            initial="visible"
            animate={hidden ? "hidden" : "visible"}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ left: '50%' }}
            className="fixed top-2 sm:top-6 z-50 w-[95vw] max-w-xl rounded-full bg-white/80 backdrop-blur-xl shadow-[0_8px_40px_0_rgba(31,38,135,0.3)] border border-white/40 flex items-center justify-center px-4 py-2 sm:px-8 sm:py-3 ring-1 ring-white/20"
        >
            <div className="hidden sm:flex items-center gap-4 absolute left-8 top-1/2 -translate-y-1/2">
                <Link href="/#how-it-works" className="text-gray-700 hover:text-blue-600 font-medium">How it Works</Link>
            </div>
            <div className="flex-1 flex justify-center">
                <Link href="/" className="font-extrabold text-xl md:text-2xl tracking-tight text-blue-600">LearnPeers</Link>
            </div>
            <div className="hidden sm:flex items-center gap-4 absolute right-8 top-1/2 -translate-y-1/2">
                <Link href="#about" className="text-gray-700 hover:text-blue-600 font-medium">About</Link>
                <Link href="/auth/login" className="inline-flex items-center gap-2 ml-2 py-2 px-4 bg-[#1559C6] text-white rounded-full font-bold hover:bg-blue-700 transition-all duration-300 hover:scale-105 shadow-lg">
                        <div className="w-2 h-2 bg-[#1559C6] rounded-full"></div>
                        Log In
                </Link>
            </div>
            {/* Mobile: Hamburger */}
            <div className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2">
                <button
                    aria-label="Open menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen(v => !v)}
                    className="inline-flex flex-col items-center justify-center w-9 h-9 rounded-full bg-white/80 border border-white/40 shadow hover:bg-white"
                >
                    <span className="block w-5 h-0.5 bg-gray-800" />
                    <span className="block w-5 h-0.5 bg-gray-800 mt-1.5" />
                    <span className="block w-5 h-0.5 bg-gray-800 mt-1.5" />
                </button>
            </div>
        </motion.nav>
        {/* Mobile dropdown */}
        {menuOpen ? (
            <div className="sm:hidden fixed top-[56px] left-0 right-0 z-40 px-4">
                <div className="mx-auto w-[95vw] max-w-xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
                    <div className="flex flex-col p-2">
                        <Link onClick={() => setMenuOpen(false)} href="/#how-it-works" className="px-3 py-3 rounded-lg text-gray-800 hover:bg-gray-50">How it Works</Link>
                        <Link onClick={() => setMenuOpen(false)} href="#about" className="px-3 py-3 rounded-lg text-gray-800 hover:bg-gray-50">About</Link>
                        <Link onClick={() => setMenuOpen(false)} href="/auth/login" className="mt-1 px-3 py-3 rounded-lg bg-[#1559C6] text-white text-center font-semibold hover:bg-blue-700">Log In</Link>
                    </div>
                </div>
            </div>
        ) : null}
        </>
    );
}
