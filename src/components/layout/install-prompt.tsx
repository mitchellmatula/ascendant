"use client";

import { useState, useEffect } from "react";
import { X, Share, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    
    if (isStandalone) return;

    // Check if already dismissed recently (7 days)
    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isAndroidDevice = /android/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // For iOS Safari, show after a short delay
    if (isIOSDevice && isSafari) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome, listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Also show for Android browsers that don't fire the event
    if (isAndroidDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <img src="/icon-192.png" alt="Ascendant" className="w-8 h-8 rounded-lg" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install Ascendant</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for the best experience
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">To install:</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">1.</span>
                <span>Tap</span>
                <Share className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Share</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">2.</span>
                <span>Tap</span>
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Add to Home Screen</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={handleDismiss}
            >
              Got it
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            {deferredPrompt ? (
              <Button
                size="sm"
                className="flex-1 text-xs"
                onClick={handleInstall}
              >
                <Download className="w-3 h-3 mr-1" />
                Install App
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">
                <p>Open in Chrome and tap the menu (⋮) → &quot;Add to Home Screen&quot;</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleDismiss}
            >
              Not now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
