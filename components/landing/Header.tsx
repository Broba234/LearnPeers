// components/HeaderSmooth.tsx
'use client';

import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export default function HeaderSmooth() {
  const [width, setWidth] = useState(1280);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const containerRef = useRef<HTMLDivElement>(null);

  const SCROLL_THRESHOLD = 200;
  const MIN_WIDTH = 640;
  const MAX_WIDTH = 1280;

  useMotionValueEvent(scrollY, "change", (latest) => {
    const progress = Math.min(Math.max((latest - SCROLL_THRESHOLD) / 300, 0), 1);
    const newWidth = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * progress;
    setWidth(newWidth);
  });

  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>('');

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Track which section is in view on the landing page
  useEffect(() => {
    if (pathname !== '/') return;

    const sectionIds = ['our-mission', 'contact'];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    // Reset to empty (Home) when scrolled to the very top
    const handleScroll = () => {
      if (window.scrollY < 200) {
        setActiveSection('');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observers.forEach((o) => o.disconnect());
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { label: 'Home', href: '/', sectionId: '' },
    { label: 'About', href: '/#our-mission', sectionId: 'our-mission' },
    { label: 'Contact', href: '/#contact', sectionId: 'contact' }
  ];

  const isNavActive = (item: typeof navItems[number]) => {
    if (pathname !== '/') return false;
    if (item.sectionId === '') return activeSection === '';
    return activeSection === item.sectionId;
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-6 right-0 w-full z-[999] left-0"
      >
        <div className="flex justify-center">
          <motion.div
            ref={containerRef}
            className="px-4 sm:px-5 py-3 sm:py-5 rounded-full bg-blue-900/20 backdrop-blur-xl mx-4 sm:mx-0"
            animate={{
              width: width,
              scale: width < MAX_WIDTH ? 0.95 : 1,
              boxShadow: width < MAX_WIDTH 
                ? "0px 0px 80px -30px rgba(59, 130, 246, 0.5)" 
                : "0px 0px 20px -10px rgba(59, 130, 246, 0.2)",
            }}
            transition={{
              width: {
                type: "spring",
                stiffness: 180,
                damping: 18,
                mass: 0.8,
              },
              scale: {
                type: "spring",
                stiffness: 300,
                damping: 25,
              },
              boxShadow: {
                type: "spring",
                stiffness: 300,
                damping: 25,
              },
            }}
            style={{
              maxWidth: MAX_WIDTH,
              minWidth: `min(${MIN_WIDTH}px, 90vw)`,
            }}
          >
            <nav className="flex items-center justify-between px-2 sm:px-4">
              <motion.div
                animate={{
                  scale: width < MAX_WIDTH ? 0.95 : 1,
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400,
                  damping: 20 
                }}
              >
                <Link 
                  href="/" 
                  className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent hover:scale-105 transition-transform block"
                >
                  LearnPeers
                </Link>
              </motion.div>

              {/* Desktop Navigation */}
              <motion.div 
                className="hidden md:flex items-center space-x-2 lg:space-x-4"
                animate={{
                  scale: width < MAX_WIDTH ? 0.98 : 1,
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 350,
                  damping: 20 
                }}
              >
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`hover:text-white transition-colors duration-200 font-medium px-3 lg:px-4 py-1 rounded-full hover:bg-white/10 whitespace-nowrap text-sm lg:text-base ${isNavActive(item) ? 'bg-white/10 text-white' : 'text-gray-700/70'}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </motion.div>

              {/* Mobile Menu Button */}
              <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/auth/login" className="hidden sm:block w-full">
           <motion.span
              whileTap={{ scale: 0.95 }}
              className="w-full block text-center py-2 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full font-medium shadow-lg hover:shadow-[0_0_40px_-10px_#3b82f6] transition-all"
              
            >
              Login
            </motion.span>
           </Link>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6 text-white" />
                  ) : (
                    <Menu className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
            </nav>
          </motion.div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <motion.div
        initial={false}
        animate={isMobileMenuOpen ? "open" : "closed"}
        variants={{
          open: { opacity: 1, pointerEvents: "auto" },
          closed: { opacity: 0, pointerEvents: "none" }
        }}
        className="fixed inset-0 z-[999] md:hidden bg-black/30 backdrop-blur-sm"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <motion.div
        initial={false}
        animate={isMobileMenuOpen ? "open" : "closed"}
        variants={{
          open: { 
            x: 0,
            transition: { type: "spring", stiffness: 300, damping: 30 }
          },
          closed: { 
            x: "100%",
            transition: { type: "spring", stiffness: 300, damping: 30, delay: 0.1 }
          }
        }}
        className="fixed top-0 right-0 bottom-0 w-64 z-[999] md:hidden bg-black/20 backdrop-blur-xl p-6 rounded-l-[50px]"
      >
        <div className="flex flex-col h-full pt-16">
          <div className="flex-1">
            <div className="mb-8">
              <Link 
                href="/" 
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                LearnPeers
              </Link>
            </div>
            
            <div className="space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`block py-3 px-4 rounded-full text-lg font-medium transition-all ${isNavActive(item)
                    ? 'bg-white/20 text-white'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t w-full border-white/20">
           <Link href="/auth/login" className="w-full block" onClick={() => setIsMobileMenuOpen(false)}>
           <motion.span
              whileTap={{ scale: 0.95 }}
              className="w-full block text-center py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full font-medium shadow-lg hover:shadow-[0_0_40px_-10px_#3b82f6] transition-all"
              
            >
              Login
            </motion.span>
           </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}