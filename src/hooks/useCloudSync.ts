import { useEffect, useState } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { CLOUD_CFG_KEY, CLOUD_SYNC_DEBOUNCE_MS, CLOUD_TABLE } from "../lib/constants";
import {
  clearCloudDirty,
  fromCloudRow,
  hasPendingCloudChanges,
  loadCloudConfig,
  toCloudRow,
} from "../lib/cloud";
import { storeGetAll, storeReplaceAll } from "../lib/storage";
import { normalizeSkill, skillKey } from "../lib/skill-utils";
import type { CloudConfig, Skill } from "../types/skill";

type UseCloudSyncOptions = {
  onSkillsUpdated?: (skills: Skill[]) => void;
};

export function useCloudSync({ onSkillsUpdated }: UseCloudSyncOptions = {}) {
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(loadCloudConfig());
  const [cloudClient, setCloudClient] = useState<SupabaseClient | null>(null);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("Cloud not connected");

  const [cloudUrl, setCloudUrl] = useState(cloudConfig.url);
  const [cloudAnon, setCloudAnon] = useState(cloudConfig.anonKey);
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudModalStatus, setCloudModalStatus] = useState("");

  const [syncTimer, setSyncTimer] = useState<number | null>(null);

  useEffect(() => {
    if (!cloudConfig.url || !cloudConfig.anonKey) {
      setCloudStatus("Cloud not connected");
      setCloudClient(null);
      setCloudUser(null);
      return;
    }

    const client = createClient(cloudConfig.url, cloudConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    setCloudClient(client);

    void client.auth.getSession().then(({ data }) => {
      setCloudUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setCloudUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cloudConfig]);

  useEffect(() => {
    if (cloudSyncing) {
      setCloudStatus("Syncing cloud...");
      return;
    }
    if (!cloudConfig.url || !cloudConfig.anonKey) {
      setCloudStatus("Cloud not connected");
      return;
    }
    if (!cloudUser) {
      setCloudStatus("Cloud configured");
      return;
    }
    setCloudStatus(`Cloud: ${cloudUser.email || "signed in"}`);
  }, [cloudConfig, cloudUser, cloudSyncing]);

  function queueCloudSync(delay = CLOUD_SYNC_DEBOUNCE_MS) {
    if (!cloudUser || !cloudClient) return;
    if (syncTimer) window.clearTimeout(syncTimer);
    const id = window.setTimeout(() => {
      void syncWithCloud();
    }, delay);
    setSyncTimer(id);
  }

  useEffect(() => {
    const triggerCloseSync = () => {
      if (!cloudUser || !cloudClient || cloudSyncing) return;
      if (!hasPendingCloudChanges()) return;
      void syncWithCloud();
    };

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!cloudUser || !cloudClient) return;
      if (!hasPendingCloudChanges()) return;
      e.preventDefault();
      e.returnValue = "";
    };

    const online = () => {
      if (hasPendingCloudChanges()) queueCloudSync(0);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") triggerCloseSync();
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", triggerCloseSync);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", online);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", triggerCloseSync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", online);
    };
  }, [cloudUser, cloudClient, cloudSyncing]);

  async function saveCloudConfig() {
    const next = { url: cloudUrl.trim(), anonKey: cloudAnon.trim() };
    if (!next.url || !next.anonKey) {
      setCloudModalStatus("Both Supabase URL and anon key are required.");
      return;
    }

    localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify(next));
    setCloudConfig(next);
    setCloudModalStatus("Cloud config saved.");
  }

  async function signInCloud() {
    if (!cloudClient) {
      setCloudModalStatus("Save cloud config first.");
      return;
    }
    if (!cloudEmail.trim()) return;
    const redirect = `${window.location.origin}${window.location.pathname}`;
    const { error } = await cloudClient.auth.signInWithOtp({
      email: cloudEmail.trim(),
      options: { emailRedirectTo: redirect },
    });
    if (error) {
      setCloudModalStatus(`Sign-in failed: ${error.message}`);
      return;
    }
    setCloudModalStatus("Magic link sent.");
  }

  async function clearCloudConfig() {
    localStorage.removeItem(CLOUD_CFG_KEY);
    setCloudConfig({ url: "", anonKey: "" });
    setCloudUrl("");
    setCloudAnon("");
    setCloudModalStatus("Cloud config cleared.");
  }

  async function signOutCloud() {
    if (!cloudClient) return;
    await cloudClient.auth.signOut();
    setCloudUser(null);
  }

  async function fetchCloudSkills() {
    if (!cloudClient || !cloudUser) return [] as Skill[];
    const { data, error } = await cloudClient
      .from(CLOUD_TABLE)
      .select("*")
      .eq("user_id", cloudUser.id);
    if (error) throw error;
    return (data ?? []).map((row) => fromCloudRow(row as Record<string, unknown>));
  }

  async function pushSkillsToCloud(items: Skill[]) {
    if (!cloudClient || !cloudUser || items.length === 0) return;
    const payload = items.map((s) => toCloudRow(s, cloudUser.id));
    const { error } = await cloudClient.from(CLOUD_TABLE).upsert(payload, {
      onConflict: "user_id,skill_key",
      ignoreDuplicates: true,
    });
    if (error) throw error;
  }

  async function removeCloudSkill(skill: Skill) {
    if (!cloudClient || !cloudUser) return;
    const { error } = await cloudClient
      .from(CLOUD_TABLE)
      .delete()
      .eq("user_id", cloudUser.id)
      .eq("skill_key", skillKey(skill));
    if (error) throw error;
  }

  async function syncWithCloud() {
    if (!cloudClient || !cloudUser || cloudSyncing) return;
    setCloudSyncing(true);
    try {
      const localSkills = (await storeGetAll()).map(normalizeSkill);
      const remoteSkills = await fetchCloudSkills();
      const remoteKeys = new Set(remoteSkills.map((s) => skillKey(s)));

      const merged = new Map<string, Skill>();
      for (const s of remoteSkills) merged.set(skillKey(s), s);
      for (const s of localSkills) {
        const k = skillKey(s);
        if (!merged.has(k)) {
          merged.set(k, s);
          continue;
        }
        const current = merged.get(k)!;
        if (new Date(s.addedAt).getTime() > new Date(current.addedAt).getTime()) {
          merged.set(k, s);
        }
      }

      const mergedSkills = [...merged.values()];
      await storeReplaceAll(mergedSkills);
      onSkillsUpdated?.(mergedSkills);

      const localOnly = localSkills.filter((s) => !remoteKeys.has(skillKey(s)));
      await pushSkillsToCloud(localOnly);
      clearCloudDirty();
      setCloudModalStatus("Cloud sync completed.");
      return mergedSkills;
    } catch (error) {
      setCloudModalStatus(`Sync failed: ${(error as Error).message}`);
      throw error;
    } finally {
      setCloudSyncing(false);
    }
  }

  return {
    cloudConfig,
    cloudUser,
    cloudSyncing,
    cloudStatus,
    cloudUrl,
    setCloudUrl,
    cloudAnon,
    setCloudAnon,
    cloudEmail,
    setCloudEmail,
    cloudModalStatus,
    saveCloudConfig,
    signInCloud,
    clearCloudConfig,
    signOutCloud,
    syncWithCloud,
    queueCloudSync,
    removeCloudSkill,
    cloudConnected: Boolean(cloudConfig.url && cloudConfig.anonKey && cloudUser),
  };
}
