import { toast } from "sonner";

const APP_SW_PATH = "/sw.js";

function isPreviewOrDev(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw") &&
      new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        return url.endsWith(APP_SW_PATH);
      })
      .map((r) => r.unregister()),
  );
}

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (isPreviewOrDev()) {
    await unregisterAppSW();
    return;
  }

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox(APP_SW_PATH);

    let refreshing = false;
    const promptUpdate = () => {
      toast("Update available", {
        description: "A new version of LoadLink is ready.",
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => {
            wb.addEventListener("controlling", () => {
              if (refreshing) return;
              refreshing = true;
              window.location.reload();
            });
            wb.messageSkipWaiting();
          },
        },
      });
    };

    wb.addEventListener("waiting", promptUpdate);
    wb.addEventListener("externalwaiting", promptUpdate);

    await wb.register();
  } catch (err) {
    console.warn("[pwa] SW registration failed", err);
  }
}
