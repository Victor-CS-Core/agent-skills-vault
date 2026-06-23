import { useEffect } from "react";

type UseCloudSyncLifecycleOptions = {
  enabled: boolean;
  cloudSyncing: boolean;
  hasPendingChanges: () => boolean;
  queueCloudSync: (delay?: number) => void;
  syncWithCloud: () => void | Promise<unknown>;
};

export function useCloudSyncLifecycle({
  enabled,
  cloudSyncing,
  hasPendingChanges,
  queueCloudSync,
  syncWithCloud,
}: UseCloudSyncLifecycleOptions) {
  useEffect(() => {
    if (!enabled) return;

    const triggerCloseSync = () => {
      if (cloudSyncing) return;
      if (!hasPendingChanges()) return;
      void syncWithCloud();
    };

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasPendingChanges()) return;
      e.preventDefault();
      e.returnValue = "";
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") triggerCloseSync();
    };

    const onOnline = () => {
      if (hasPendingChanges()) queueCloudSync(0);
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", triggerCloseSync);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", triggerCloseSync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, cloudSyncing, hasPendingChanges, queueCloudSync, syncWithCloud]);
}
