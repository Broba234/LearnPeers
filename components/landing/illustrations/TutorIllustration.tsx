"use client";
import { motion } from "framer-motion";

export default function TutorIllustration() {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Background blob */}
      <motion.ellipse
        cx="250"
        cy="260"
        rx="180"
        ry="175"
        fill="url(#tutorBg)"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Whiteboard / presentation board */}
      <motion.g
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* Board legs */}
        <line x1="175" y1="320" x2="160" y2="380" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" />
        <line x1="325" y1="320" x2="340" y2="380" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" />

        {/* Board frame */}
        <rect x="145" y="155" width="210" height="165" rx="6" fill="#0e4360" />
        <rect x="152" y="162" width="196" height="151" rx="3" fill="white" />

        {/* Board content - diagram */}
        {/* Central circle */}
        <circle cx="250" cy="225" r="22" fill="#d8eefa" stroke="#0077be" strokeWidth="2" />
        <text x="250" y="229" textAnchor="middle" fill="#0077be" fontSize="10" fontWeight="bold">
          Core
        </text>

        {/* Connecting nodes */}
        <line x1="232" y1="210" x2="200" y2="190" stroke="#4ca9de" strokeWidth="1.5" />
        <circle cx="192" cy="185" r="14" fill="#eff8fd" stroke="#4ca9de" strokeWidth="1.5" />

        <line x1="268" y1="210" x2="300" y2="190" stroke="#4ca9de" strokeWidth="1.5" />
        <circle cx="308" cy="185" r="14" fill="#eff8fd" stroke="#4ca9de" strokeWidth="1.5" />

        <line x1="235" y1="243" x2="205" y2="268" stroke="#4ca9de" strokeWidth="1.5" />
        <circle cx="198" cy="274" r="14" fill="#eff8fd" stroke="#4ca9de" strokeWidth="1.5" />

        <line x1="265" y1="243" x2="295" y2="268" stroke="#4ca9de" strokeWidth="1.5" />
        <circle cx="302" cy="274" r="14" fill="#eff8fd" stroke="#4ca9de" strokeWidth="1.5" />

        {/* Small dots inside nodes */}
        <circle cx="192" cy="185" r="4" fill="#0077be" opacity="0.6" />
        <circle cx="308" cy="185" r="4" fill="#0077be" opacity="0.6" />
        <circle cx="198" cy="274" r="4" fill="#0077be" opacity="0.6" />
        <circle cx="302" cy="274" r="4" fill="#0077be" opacity="0.6" />

        {/* Board tray */}
        <rect x="170" y="318" width="160" height="6" rx="2" fill="#374151" />
      </motion.g>

      {/* Pointer / wand - right side */}
      <motion.g
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <motion.g
          animate={{ rotate: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          style={{ transformOrigin: "390px 260px" }}
        >
          <line x1="370" y1="210" x2="395" y2="290" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
          <circle cx="368" cy="207" r="4" fill="#ef4444" />
        </motion.g>
      </motion.g>

      {/* Floating speech bubble - top right */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <motion.g
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        >
          <rect x="365" y="115" width="80" height="50" rx="12" fill="#0077be" />
          <polygon points="380,165 388,165 375,178" fill="#0077be" />
          {/* Speech lines */}
          <rect x="378" y="130" width="40" height="4" rx="2" fill="white" opacity="0.8" />
          <rect x="378" y="140" width="52" height="4" rx="2" fill="white" opacity="0.5" />
          <rect x="378" y="150" width="30" height="4" rx="2" fill="white" opacity="0.8" />
        </motion.g>
      </motion.g>

      {/* People icons - bottom left (students) */}
      <motion.g
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <motion.g
          animate={{ y: [0, -5, 0] }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
            delay: 0.8,
          }}
        >
          {/* Person 1 */}
          <circle cx="85" cy="280" r="10" fill="#84c6ec" />
          <rect x="75" y="294" width="20" height="24" rx="8" fill="#84c6ec" />

          {/* Person 2 */}
          <circle cx="115" cy="275" r="10" fill="#4ca9de" />
          <rect x="105" y="289" width="20" height="24" rx="8" fill="#4ca9de" />

          {/* Person 3 */}
          <circle cx="100" cy="250" r="10" fill="#1f8dcc" />
          <rect x="90" y="264" width="20" height="24" rx="8" fill="#1f8dcc" />
        </motion.g>
      </motion.g>

      {/* Trophy / achievement - top left */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <motion.g
          animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: "easeInOut",
            delay: 0.5,
          }}
        >
          {/* Cup */}
          <path
            d="M120 130 L115 155 Q127.5 165 140 155 L135 130 Z"
            fill="#f59e0b"
          />
          {/* Cup shine */}
          <path
            d="M122 135 L120 148 Q125 152 128 148 L126 135 Z"
            fill="#fde68a"
            opacity="0.6"
          />
          {/* Handles */}
          <path d="M115 135 Q105 140 112 152" stroke="#d97706" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M140 135 Q150 140 143 152" stroke="#d97706" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Base */}
          <rect x="120" y="155" width="16" height="4" rx="1" fill="#d97706" />
          <rect x="117" y="159" width="22" height="4" rx="1" fill="#b45309" />
          {/* Star */}
          <polygon
            points="127.5,138 129.5,143 135,143 130.5,146.5 132,152 127.5,148.5 123,152 124.5,146.5 120,143 125.5,143"
            fill="#fde68a"
            opacity="0.9"
          />
        </motion.g>
      </motion.g>

      {/* Checkmark / success badge - bottom right */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        <motion.g
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 1 }}
        >
          <circle cx="400" cy="360" r="20" fill="#10b981" />
          <path
            d="M390 360 L397 367 L412 352"
            stroke="white"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      </motion.g>

      {/* Floating connection lines */}
      <motion.g opacity="0.3">
        <motion.line
          x1="125"
          y1="265"
          x2="152"
          y2="240"
          stroke="#4ca9de"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ repeat: Infinity, duration: 3 }}
        />
        <motion.line
          x1="355"
          y1="300"
          x2="395"
          y2="345"
          stroke="#4ca9de"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ repeat: Infinity, duration: 3.5, delay: 0.5 }}
        />
      </motion.g>

      {/* Floating dots */}
      <motion.circle
        cx="80"
        cy="180"
        r="4"
        fill="#84c6ec"
        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
      />
      <motion.circle
        cx="430"
        cy="230"
        r="3"
        fill="#4ca9de"
        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.4, 1] }}
        transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
      />
      <motion.circle
        cx="350"
        cy="400"
        r="4"
        fill="#84c6ec"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ repeat: Infinity, duration: 3.5, delay: 1 }}
      />
      <motion.circle
        cx="70"
        cy="350"
        r="3"
        fill="#ddd6fe"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
      />

      {/* Gradients */}
      <defs>
        <radialGradient id="tutorBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d8eefa" />
          <stop offset="70%" stopColor="#eff8fd" />
          <stop offset="100%" stopColor="#eff8fd" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
