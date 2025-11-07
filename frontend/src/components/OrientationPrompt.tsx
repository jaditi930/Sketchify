'use client';

import { useEffect, useState } from 'react';

export default function OrientationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     (window.matchMedia('(max-width: 768px)').matches && 'ontouchstart' in window);

    if (!isMobile) {
      return;
    }

    const checkOrientation = () => {
      // Use Screen Orientation API if available, otherwise fall back to window dimensions
      let isPortrait = false;
      
      if (window.screen?.orientation) {
        // Modern approach using Screen Orientation API
        const angle = window.screen.orientation.angle;
        isPortrait = angle === 0 || angle === 180;
      } else if ((window as any).orientation !== undefined) {
        // Fallback for older devices
        const orientation = (window as any).orientation;
        isPortrait = orientation === 0 || orientation === 180;
      } else {
        // Final fallback: check window dimensions
        isPortrait = window.innerHeight > window.innerWidth;
      }
      
      // Show prompt if in portrait and not dismissed
      if (isPortrait && !isDismissed) {
        setShowPrompt(true);
      } else {
        setShowPrompt(false);
      }
    };

    // Small delay to ensure accurate orientation detection on mount
    const timeoutId = setTimeout(() => {
      checkOrientation();
    }, 100);

    // Handle orientation change with delay
    const handleOrientationChange = () => {
      // Add small delay to ensure orientation has changed
      setTimeout(checkOrientation, 100);
    };

    // Check on orientation change
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', checkOrientation);

    // Also listen to screen orientation change event if available
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', checkOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 dark:bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 animate-fade-in">
        <div className="text-center">
          {/* Rotate Icon */}
          <div className="mb-4 flex justify-center">
            <div className="relative w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>

          {/* Message */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Rotate Your Device
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            For the best drawing experience, please rotate your device to landscape mode.
          </p>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

