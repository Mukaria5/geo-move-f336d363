import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallPWAButton({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isIOS()) {
      setShowIOS(true);
      return;
    }
    // Fallback hint for desktop browsers that don't fire beforeinstallprompt yet
    setShowIOS(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          "inline-flex items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent"
        }
      >
        <Download className="h-4 w-4" />
        Install app
      </button>

      {showIOS && (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setShowIOS(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground">Install LoadLink</h3>
            {isIOS() ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Tap the <Share className="mx-1 inline h-4 w-4" /> Share icon in Safari, then choose{" "}
                <span className="font-medium text-foreground">Add to Home Screen</span>.
              </p>
            ) : (
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Chrome / Edge (desktop):</span> click the
                  install icon in the address bar, or open the browser menu and choose{" "}
                  <span className="font-medium text-foreground">Install LoadLink</span>.
                </p>
                <p>
                  <span className="font-medium text-foreground">Android Chrome:</span> open the menu (⋮) and
                  tap <span className="font-medium text-foreground">Add to Home screen</span>.
                </p>
                <p className="text-xs">
                  Firefox and some in-app browsers don't support installing web apps.
                </p>
              </div>
            )}
            <button
              onClick={() => setShowIOS(false)}
              className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
