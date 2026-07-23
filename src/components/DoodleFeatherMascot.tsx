'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface DoodleFeatherMascotProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export default function DoodleFeatherMascot({
  className = "w-20 h-20 md:w-24 md:h-24",
  width,
  height,
}: DoodleFeatherMascotProps) {
  return (
    <motion.div 
      animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      className={`flex items-center justify-center ${className}`} 
      style={{ width, height }}
    >
      <svg viewBox="0 0 300 300" className="w-full h-full text-secondary drop-shadow-sm overflow-visible">
        {/* Quill Stem / Spine */}
        <motion.path
          d="M90 240 Q140 160 210 50"
          fill="none"
          stroke="#111827"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        {/* Feather Vane Body Contour */}
        <motion.path
          d="M90 240 C120 170 150 130 210 50 C100 80 70 180 90 240 Z"
          fill="rgba(249, 87, 56, 0.08)"
          stroke="#F95738"
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        />
        {/* Subtle Decorative Hatch Lines */}
        <path
          d="M 120 180 L 105 175 M 140 150 L 122 145 M 165 115 L 145 110 M 185 82 L 168 78"
          stroke="#F95738"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        {/* Sparkle Accent */}
        <motion.path
          d="M 225 40 L 230 45 L 225 50 L 220 45 Z"
          fill="#F95738"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
}
