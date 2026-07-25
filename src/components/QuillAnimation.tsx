"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

// Path that writes "Iris" in cursive and extends a long trailing "s" tail
const RIVER_PATH =
  "M 100, 180 " +
  "C 120, 220 140, 220 150, 200 " +  // Bottom swoop of I
  "C 160, 120 170, 100 150, 100 " +  // Top loop of I
  "C 130, 100 120, 180 150, 220 " +  // Down stroke of I
  "C 170, 250 180, 180 200, 180 " +  // Up to r
  "C 220, 180 210, 220 230, 220 " +  // Down stroke of r
  "C 250, 220 250, 180 260, 180 " +  // Up to i
  "C 270, 180 260, 220 280, 220 " +  // Down stroke of i
  "C 300, 220 310, 180 320, 180 " +  // Up to s
  "C 330, 180 290, 230 330, 230 " +  // Loop belly of s
  "C 370, 230 380, 180 420, 210 " +  // Start of long s tail
  "C 460, 240 500, 250 540, 210 " +  // Tail wave 1
  "C 580, 170 620, 230 680, 210";    // Tail wave 2

// Helper to generate texture lines for the thinner feather
const renderTextureLines = () => {
  const lines = [];
  // Right side lines
  for (let i = 0; i < 28; i++) {
    const t = i / 28;
    const startX = t * 15;
    const startY = -15 - t * 205;
    const endX = startX + 5 + Math.sin(t * Math.PI) * 15;
    const endY = startY - 5 - Math.sin(t * Math.PI) * 10;
    lines.push(
      <line
        key={`r-${i}`}
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="#171717"
        strokeWidth="1"
        opacity="0.7"
        strokeLinecap="round"
      />
    );
  }
  // Left side lines
  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    const startX = t * 15;
    const startY = -15 - t * 205;
    const endX = startX - 5 - Math.sin(t * Math.PI) * 10;
    const endY = startY - 5 - Math.sin(t * Math.PI) * 10;
    lines.push(
      <line
        key={`l-${i}`}
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="#171717"
        strokeWidth="1"
        opacity="0.7"
        strokeLinecap="round"
      />
    );
  }
  return lines;
};

export default function QuillAnimation() {
  const [mounted, setMounted] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const mainTrailRef = useRef<SVGPathElement>(null);

  const animRef = useRef<number>(0);
  // Fixed angle pointing up-right
  const [quillState, setQuillState] = useState({ x: 100, y: 180, angle: 45 });
  const [pathLength, setPathLength] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure path length & initialize dashoffset
  useEffect(() => {
    if (mounted && pathRef.current) {
      const len = pathRef.current.getTotalLength();
      setPathLength(len);
      if (mainTrailRef.current)
        mainTrailRef.current.style.strokeDashoffset = `${len}`;
    }
  }, [mounted]);

  // Direct DOM manipulation in animation loop for 60fps frame-perfect progressive reveal
  const animate = useCallback(
    (timestamp: number) => {
      if (!pathRef.current || pathLength === 0) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const cycleDuration = 5500; // 5.5s sweep for a complex signature
      const pauseDuration = 1800; // 1.8s pause at end
      const totalCycle = cycleDuration + pauseDuration;

      const cycleTime = elapsed % totalCycle;

      if (cycleTime <= cycleDuration) {
        // Smooth easing (ease-in-out)
        const rawProgress = cycleTime / cycleDuration;
        const progress =
          rawProgress < 0.5
            ? 2 * rawProgress * rawProgress
            : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

        const path = pathRef.current;
        const currentLen = progress * pathLength;
        const point = path.getPointAtLength(currentLen);

        // Feather only translates, angle remains fixed
        setQuillState({
          x: point.x,
          y: point.y,
          angle: 45,
        });

        // Progressive reveal of the thin ink line
        const offset = pathLength - currentLen;
        if (mainTrailRef.current)
          mainTrailRef.current.style.strokeDashoffset = `${offset}`;
      } else {
        // During pause at end, keep fully revealed, then reset when cycle restarts
        if (cycleTime > cycleDuration + pauseDuration - 50) {
          if (mainTrailRef.current)
            mainTrailRef.current.style.strokeDashoffset = `${pathLength}`;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    },
    [pathLength]
  );

  useEffect(() => {
    if (mounted && pathLength > 0) {
      animRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animRef.current);
    }
  }, [mounted, pathLength, animate]);

  return (
    <div
      className={`flex flex-col items-center justify-center py-4 sm:py-6 transition-all duration-1000 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Animation Container */}
      <div className="relative w-full max-w-4xl mx-auto" style={{ height: 240 }}>
        
        {/* ViewBox adjusted for wide left-to-right signature motion */}
        <svg
          viewBox="0 0 800 350"
          className="w-full h-full relative z-10 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ===== BLACK INK TRAIL ===== */}
          <path
            ref={mainTrailRef}
            d={RIVER_PATH}
            stroke="#171717"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={pathLength || 1000}
            strokeDashoffset={pathLength || 1000}
          />

          {/* Dot for the 'i' in Iris (static, appears part of the signature) */}
          <circle cx="270" cy="150" r="1.5" fill="#171717" />

          {/* Hidden measurement path */}
          <path ref={pathRef} d={RIVER_PATH} stroke="transparent" fill="none" />

          {/* ===== THE MINIMALIST THIN QUILL ===== */}
          <g
            style={{
              transform: `translate(${quillState.x}px, ${quillState.y}px) rotate(${quillState.angle}deg)`,
              transformOrigin: "0px 0px",
            }}
          >
            <g transform="scale(0.8)">
              {/* Feather — Main Right Vane (Thinner shape) */}
              <path
                d="M 6,-18 
                   C 12,-35 20,-60 25,-90 
                   C 30,-120 35,-150 35,-180 
                   C 35,-205 28,-225 20,-240 
                   C 15,-250 12,-252 10,-253 
                   C 15,-240 20,-210 20,-180 
                   C 20,-150 15,-120 12,-90 
                   C 10,-60 8,-40 6,-18 Z"
                fill="#FFFFFF"
                stroke="#171717"
                strokeWidth="1.5"
              />

              {/* Feather — Left Vane (Thinner shape) */}
              <path
                d="M 6,-18 
                   C 0,-35 -8,-60 -13,-90 
                   C -18,-120 -23,-150 -23,-180 
                   C -23,-205 -16,-225 -8,-240 
                   C -3,-250 0,-252 2,-253 
                   C -3,-240 -8,-210 -8,-180 
                   C -8,-150 -3,-120 0,-90 
                   C 2,-60 4,-40 6,-18 Z"
                fill="#FFFFFF"
                stroke="#171717"
                strokeWidth="1.5"
              />

              {/* Texture Lines */}
              {renderTextureLines()}

              {/* Central Shaft / Rachis */}
              <line
                x1="12"
                y1="-253"
                x2="0"
                y2="0"
                stroke="#171717"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* ===== NIB ===== */}
              <rect
                x="-4"
                y="-14"
                width="8"
                height="5"
                rx="1"
                fill="#FFFFFF"
                stroke="#171717"
                strokeWidth="1.5"
              />

              <path
                d="M -4,-9 L -5, -3 L 0, 0 L 5, -3 L 4, -9 Z"
                fill="#FFFFFF"
                stroke="#171717"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              <line
                x1="0"
                y1="-9"
                x2="0"
                y2="-1"
                stroke="#171717"
                strokeWidth="1"
              />

              <circle cx="0" cy="-7" r="1" fill="#171717" />
            </g>
          </g>
        </svg>
      </div>

      {/* Text below animation */}
      <motion.div
        className="text-center space-y-3 relative z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 tracking-tight">
          Votre histoire commence ici
        </h3>
        <p className="text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
          Laissez votre plume créer des œuvres extraordinaires.
          <br />
          Iris vous accompagne à chaque mot.
        </p>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="mt-8 relative z-20"
      >
        <Link href="/redaction" className="group">
          <button className="relative bg-gradient-to-r from-orange-500 via-secondary to-amber-500 text-white font-bold text-sm px-8 py-4 rounded-2xl shadow-lg shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-300/50 transition-all duration-300 flex items-center gap-3 group-hover:scale-[1.03] active:scale-[0.98] overflow-hidden cursor-pointer">
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="material-symbols-outlined text-xl relative z-10">
              edit_note
            </span>
            <span className="relative z-10">Écrire mon livre</span>
            <span className="material-symbols-outlined text-base relative z-10 group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
