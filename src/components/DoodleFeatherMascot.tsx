'use client';

import React, { useSyncExternalStore } from 'react';
import Lottie from 'lottie-react';
import featherAnimationData from '@/assets/doodle-feather.json';

interface DoodleFeatherMascotProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  autoplay?: boolean;
}

const emptySubscribe = () => () => {};

export default function DoodleFeatherMascot({
  className = "w-20 h-20 md:w-24 md:h-24",
  width,
  height,
  loop = true,
  autoplay = true
}: DoodleFeatherMascotProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    // SSR Static SVG Fallback for instant render without hydration warning
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <svg viewBox="0 0 300 300" className="w-full h-full text-[#F95738] drop-shadow-sm">
          <path
            d="M90 240 Q140 160 210 50"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M90 240 C120 170 150 130 210 50 C100 80 70 180 90 240 Z"
            fill="none"
            stroke="#F95738"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
      <Lottie
        animationData={featherAnimationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
