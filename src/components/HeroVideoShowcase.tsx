"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

export default function HeroVideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Play only when in viewport to save bandwidth and CPU
    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && containerRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
            }
          } else {
            video.pause();
            setIsPlaying(false);
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(containerRef.current);
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener("timeupdate", updateProgress);
    return () => {
      if (observer) observer.disconnect();
      video.removeEventListener("timeupdate", updateProgress);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    const bar = e.currentTarget;
    if (!video || !bar) return;

    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  return (
    <div className="w-full mt-14 sm:mt-20 relative z-20">
      {/* Outer frame container */}
      <div 
        ref={containerRef}
        className="relative group rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-neutral-900 shadow-2xl shadow-neutral-900/15 overflow-hidden transition-all duration-300"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Soft atmospheric ambient glow behind the video card */}
        <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-tr from-[#C84B31]/20 via-amber-500/10 to-[#C84B31]/20 rounded-3xl blur-2xl opacity-60 pointer-events-none -z-10" />

        {/* Video Player Area */}
        <div 
          className="relative w-full aspect-video bg-neutral-950 cursor-pointer flex items-center justify-center overflow-hidden"
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src="/iris-motion-ad.mp4"
            poster="/iris-video-poster.webp"
            playsInline
            muted
            loop
            preload="metadata"
            className="w-full h-full object-cover"
          />

          {/* Center Play Button Overlay when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center transition-all">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#C84B31] hover:bg-[#B83E26] text-white flex items-center justify-center shadow-xl transform transition-transform hover:scale-110 cursor-pointer"
                aria-label="Lire la vidéo"
              >
                <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-white" />
              </button>
            </div>
          )}

          {/* Floating Sound Toggle Pill (Top-right) */}
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={toggleMute}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg backdrop-blur-md cursor-pointer ${
                isMuted
                  ? "bg-black/75 hover:bg-black/90 text-white border border-white/20"
                  : "bg-[#C84B31] text-white border border-transparent"
              }`}
              title={isMuted ? "Activer le son" : "Couper le son"}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-white/90" />
                  <span>Activer le son</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-white" />
                  <span>Son activé</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom Custom Controls Bar (Fade in on hover or when paused) */}
          <div 
            className={`absolute bottom-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
              showControls || !isPlaying ? "opacity-100" : "opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Seek Bar */}
            <div 
              className="w-full h-1.5 bg-white dark:bg-neutral-900/20 rounded-full mb-3 cursor-pointer overflow-hidden relative group/bar"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-[#C84B31] transition-all duration-100 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg hover:bg-white dark:bg-neutral-900/20 text-white transition-colors cursor-pointer"
                  aria-label={isPlaying ? "Mettre en pause" : "Lire"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-white dark:bg-neutral-900/20 text-white transition-colors cursor-pointer"
                  aria-label={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg hover:bg-white dark:bg-neutral-900/20 text-white transition-colors cursor-pointer"
                  aria-label="Plein écran"
                >
                  <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
