import { useEffect, useState } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { CLOUD_CFG_KEY, CLOUD_SYNC_DEBOUNCE_MS } from "../lib/constants";
import {
  addPendingCloudDeleteKey,
  clearCloudDirty,
  clearPendingCloudDeleteKeys,
  hasPendingCloudChanges,
  loadCloudConfig,
  loadPendingCloudDeleteKeys,
  removePendingCloudDeleteKey,
} from "../lib/cloud";
import { skillKey } from "../lib/skill-utils";
import { runSyncEngine } from "../lib/sync-engine";
import {
  createSkillRepositoryAdapter,
  createSupabaseCloudSkillsAdapter,
  removeCloudSkillByKey,
} from "../lib/cloud-sync-adapters";
import { useCloudSyncLifecycle } from "./useCloudSyncLifecycle";
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

  useCloudSyncLifecycle({
    enabled: Boolean(cloudUser && cloudClient),
    cloudSyncing,
    hasPendingChanges: hasPendingCloudChanges,
    queueCloudSync,
    syncWithCloud,
  });

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

  async function removeCloudSkill(skill: Skill) {
    const key = skillKey(skill);
    addPendingCloudDeleteKey(key);

    if (!cloudClient || !cloudUser) return;

    try {
      await removeCloudSkillByKey(cloudClient, cloudUser, skill);
      removePendingCloudDeleteKey(key);
    } catch {
      // keep the key queued for the next sync plan
    }
  }

  async function syncWithCloud() {
    if (!cloudClient || !cloudUser || cloudSyncing) return;
    setCloudSyncing(true);
    try {
      const repositoryAdapter = createSkillRepositoryAdapter();
      const cloudSkillsAdapter = createSupabaseCloudSkillsAdapter(
        cloudClient,
        cloudUser,
      );

      const pendingDeleteKeys = loadPendingCloudDeleteKeys();

      const { mergedSkills, syncPlan } = await runSyncEngine(
        repositoryAdapter,
        cloudSkillsAdapter,
        { pendingDeleteKeys },
      );

      onSkillsUpdated?.(mergedSkills);

      clearCloudDirty();
      clearPendingCloudDeleteKeys(syncPlan.deleteCloudKeys);
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
