"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function About() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    return (
        <section id="about" ref={ref} className="py-28 bg-gradient-to-b from-white via-gray-50 to-white">
            <div className="container mx-auto px-8">
                <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-4xl md:text-5xl font-extrabold text-center text-blue-900 mb-10"
                >
                    Our Mission
                </motion.h2>
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="max-w-4xl mx-auto text-center text-gray-700 leading-relaxed"
                >
                    <p className="mb-6 text-lg">
                        LearnPeers was founded on a simple principle: education should be accessible to everyone. Believing that learning is a lifelong journey, the best way to learn is by connecting with others who have the knowledge and experience to share.
                    </p>
                    <p className="text-lg">
                        Our mission is to foster a global community of learners and educators, enabling everyone to access the help they need to achieve their goals. Whether you're a student struggling with a difficult subject or a tutor eager to share your passion, LearnPeers is the place for you.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}