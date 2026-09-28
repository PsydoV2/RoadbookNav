'use client';

import { useEffect, useRef } from 'react';

interface NetworkInformation {
  saveData?: boolean;
}

/**
 * Promo video that costs nothing until it's actually seen:
 * - preload="none" + tiny WebP poster → zero video bytes on initial page load
 * - plays (muted) only while in the viewport, pauses when scrolled away
 * - no autoplay for prefers-reduced-motion or Save-Data users (poster + controls instead)
 * - 720p source for small screens, 1080p otherwise
 */
export default function PromoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React doesn't reliably reflect `muted` as an attribute, so set the property.
    video.muted = true;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const saveData = (
      navigator as Navigator & { connection?: NetworkInformation }
    ).connection?.saveData;
    if (reducedMotion || saveData) return;

    // Don't fight the user: once they pause manually, stop auto-resuming.
    let userPaused = false;
    let observerPausing = false;
    const onPause = () => {
      if (!observerPausing) userPaused = true;
      observerPausing = false;
    };
    const onPlay = () => {
      userPaused = false;
    };
    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!userPaused && video.paused) video.play().catch(() => {});
        } else if (!video.paused) {
          observerPausing = true;
          video.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="w-full h-auto block aspect-video bg-black"
      width={1920}
      height={1080}
      poster="/video/brag-poster.webp"
      preload="none"
      muted
      loop
      playsInline
      controls
      disablePictureInPicture
      aria-label="Roadbook Nav in 22 seconds: plan a route at home, ride it offline"
    >
      <source
        src="/video/brag-720.mp4"
        type="video/mp4"
        media="(max-width: 767px)"
      />
      <source src="/video/brag-1080.mp4" type="video/mp4" />
    </video>
  );
}
