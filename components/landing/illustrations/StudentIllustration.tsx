"use client";
import { motion } from "framer-motion";

export default function StudentIllustration() {
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
        fill="url(#studentBg)"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Laptop base */}
      <motion.g
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* Laptop screen */}
        <rect x="155" y="180" width="190" height="130" rx="8" fill="#0e4360" />
        <rect x="163" y="188" width="174" height="114" rx="4" fill="#d8eefa" />

        {/* Screen content - code lines */}
        <rect x="175" y="205" width="80" height="6" rx="3" fill="#0077be" opacity="0.7" />
        <rect x="175" y="218" width="110" height="6" rx="3" fill="#1f8dcc" opacity="0.5" />
        <rect x="175" y="231" width="60" height="6" rx="3" fill="#0077be" opacity="0.7" />
        <rect x="175" y="244" width="95" height="6" rx="3" fill="#4ca9de" opacity="0.5" />
        <rect x="175" y="257" width="130" height="6" rx="3" fill="#0077be" opacity="0.4" />
        <rect x="175" y="270" width="70" height="6" rx="3" fill="#1f8dcc" opacity="0.6" />

        {/* Screen chart */}
        <rect x="280" y="230" width="10" height="30" rx="2" fill="#0077be" opacity="0.6" />
        <rect x="295" y="220" width="10" height="40" rx="2" fill="#1f8dcc" opacity="0.7" />
        <rect x="310" y="210" width="10" height="50" rx="2" fill="#0077be" opacity="0.8" />

        {/* Laptop keyboard */}
        <path
          d="M140 310 L155 310 L155 312 Q250 325 345 312 L345 310 L360 310 L370 330 Q250 345 130 330 Z"
          fill="#0e4360"
        />
        <ellipse cx="250" cy="320" rx="110" ry="8" fill="#1e40af" opacity="0.3" />
      </motion.g>

      {/* Floating book - left */}
      <motion.g
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <motion.g
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <rect x="80" y="220" width="45" height="55" rx="4" fill="#0077be" />
          <rect x="83" y="223" width="39" height="49" rx="2" fill="#d8eefa" />
          <rect x="89" y="232" width="27" height="3" rx="1.5" fill="#84c6ec" />
          <rect x="89" y="239" width="20" height="3" rx="1.5" fill="#84c6ec" />
          <rect x="89" y="246" width="24" height="3" rx="1.5" fill="#84c6ec" />
        </motion.g>
      </motion.g>

      {/* Floating lightbulb - top right */}
      <motion.g
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <motion.g
          animate={{ y: [0, -10, 0] }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: "easeInOut",
            delay: 0.5,
          }}
        >
          {/* Bulb glow */}
          <circle cx="380" cy="155" r="28" fill="#fbbf24" opacity="0.15" />
          {/* Bulb */}
          <circle cx="380" cy="155" r="18" fill="#fbbf24" />
          <circle cx="380" cy="155" r="12" fill="#fde68a" />
          {/* Filament */}
          <path
            d="M376 150 Q380 158 384 150"
            stroke="#f59e0b"
            strokeWidth="2"
            fill="none"
          />
          {/* Base */}
          <rect x="374" y="172" width="12" height="8" rx="2" fill="#d97706" />
          {/* Rays */}
          <line x1="380" y1="125" x2="380" y2="118" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="405" y1="135" x2="410" y2="130" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="355" y1="135" x2="350" y2="130" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </motion.g>

      {/* Graduation cap - top left */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <motion.g
          animate={{ y: [0, -6, 0], rotate: [0, 3, 0] }}
          transition={{
            repeat: Infinity,
            duration: 3.5,
            ease: "easeInOut",
            delay: 1,
          }}
        >
          <polygon points="140,130 180,115 220,130 180,145" fill="#0077be" />
          <polygon points="140,130 180,145 180,150 140,135" fill="#2563eb" />
          <polygon points="220,130 180,145 180,150 220,135" fill="#1d4ed8" />
          {/* Tassel */}
          <line x1="210" y1="130" x2="215" y2="155" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="215" cy="158" r="3" fill="#f59e0b" />
        </motion.g>
      </motion.g>

      {/* Atom / science icon - right */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
          style={{ transformOrigin: "400px 280px" }}
        >
          <ellipse
            cx="400"
            cy="280"
            rx="30"
            ry="10"
            stroke="#4ca9de"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <ellipse
            cx="400"
            cy="280"
            rx="30"
            ry="10"
            stroke="#4ca9de"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
            transform="rotate(60 400 280)"
          />
          <ellipse
            cx="400"
            cy="280"
            rx="30"
            ry="10"
            stroke="#4ca9de"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
            transform="rotate(120 400 280)"
          />
        </motion.g>
        <circle cx="400" cy="280" r="5" fill="#1f8dcc" />
      </motion.g>

      {/* Pencil - bottom left */}
      <motion.g
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        <motion.g
          animate={{ y: [0, -5, 0], rotate: [0, -2, 0] }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: "easeInOut",
            delay: 1.5,
          }}
        >
          <rect
            x="100"
            y="340"
            width="60"
            height="12"
            rx="2"
            fill="#f59e0b"
            transform="rotate(-25 130 346)"
          />
          <polygon
            points="88,365 95,355 100,362"
            fill="#0e4360"
            transform="rotate(-25 94 360)"
          />
        </motion.g>
      </motion.g>

      {/* Floating dots */}
      <motion.circle
        cx="120"
        cy="170"
        r="4"
        fill="#84c6ec"
        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
      />
      <motion.circle
        cx="420"
        cy="210"
        r="3"
        fill="#4ca9de"
        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.4, 1] }}
        transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
      />
      <motion.circle
        cx="340"
        cy="370"
        r="5"
        fill="#84c6ec"
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 3.5, delay: 1 }}
      />
      <motion.circle
        cx="150"
        cy="380"
        r="3"
        fill="#84c6ec"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
      />

      {/* Gradients */}
      <defs>
        <radialGradient id="studentBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d8eefa" />
          <stop offset="70%" stopColor="#eff8fd" />
          <stop offset="100%" stopColor="#eff8fd" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
