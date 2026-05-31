"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FiSearch, FiCalendar, FiAward, FiBookOpen, FiDollarSign, FiShare2 } from "react-icons/fi";
import Link from "next/link";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface StepProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const Step = ({ icon, title, children }: StepProps) => (
    <motion.div variants={itemVariants} className="flex items-start space-x-4">
        <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white">
                {icon}
            </div>
        </div>
        <div>
            <h4 className="text-xl font-semibold text-gray-900">{title}</h4>
            <p className="mt-1 text-gray-600">{children}</p>
        </div>
    </motion.div>
);

export default function HowItWorks() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    return (
        <section id="how-it-works" ref={ref} className="py-28 bg-gradient-to-b from-white via-gray-50 to-white flex items-center relative z-[60]">
            <div className="container mx-auto px-4">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                        A Marketplace for <span className="text-blue-600">Knowledge</span>
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                        LearnPeers is a seamless peer-to-peer platform where students seeking help connect directly with students offering it.
                    </p>
                </motion.div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="grid md:grid-cols-2 gap-x-12 gap-y-16 items-start"
                >
                    {/* For Students */}
                    <motion.div variants={itemVariants} className="space-y-8 p-10 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-blue-100">
                        <h3 className="text-3xl font-bold text-center text-blue-900">Want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Learn</span>?</h3>
                        <div className="space-y-6">
                            <Step icon={<FiSearch size={24} />} title="Find Your Tutor">
                                Search our network of skilled peer tutors for any subject.
                            </Step>
                            <Step icon={<FiCalendar size={24} />} title="Book Instantly">
                                Pick a time that works for you and book your session in seconds.
                            </Step>
                            <Step icon={<FiAward size={24} />} title="Achieve Your Goals">
                                Get personalized help to master concepts, ace exams, and excel.
                            </Step>
                        </div>
                    </motion.div>

                    {/* For Tutors */}
                    <motion.div variants={itemVariants} className="space-y-8 p-10 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-teal-100">
                        <h3 className="text-3xl font-bold text-center text-blue-900">Want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-green-600">Earn</span>?</h3>
                        <div className="space-y-6">
                            <Step icon={<FiShare2 size={24} />} title="Share Your Skills">
                                If you excel in a subject, you can become a tutor and help others.
                            </Step>
                            <Step icon={<FiBookOpen size={24} />} title="Set Your Schedule">
                                Offer your expertise on your own time. You control your availability.
                            </Step>
                            <Step icon={<FiDollarSign size={24} />} title="Get Paid">
                                Monetize your knowledge and earn by helping your peers succeed.
                            </Step>
                        </div>
                    </motion.div>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.8 }} 
                    className="mt-20 text-center"
                >
                    <Link href="/auth/register?role=student" className="group inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-2xl px-10 py-4 text-white font-bold text-lg transition-all duration-300 hover:scale-105 shadow-xl mx-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full group-hover:animate-pulse"></div>
                        Start Learning
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                    <Link href="/auth/register?role=tutor" className="group inline-flex items-center gap-3 bg-teal-600 hover:bg-teal-700 border border-teal-500 rounded-2xl px-10 py-4 text-white font-bold text-lg transition-all duration-300 hover:scale-105 shadow-xl mx-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full group-hover:animate-pulse"></div>
                        Start Earning
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
