"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  applyEntitlementRefreshResult,
  createRefreshLock,
  parsePlusUsage,
  PLUS_USAGE_ENDPOINT,
  PLUS_USAGE_REFRESH_ERROR,
  type PlusUsage,
} from "@/lib/plus/usage";

type PlusUsageContextValue = {
  usage: PlusUsage | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<PlusUsage | null>;
  hydrate: (usage: PlusUsage | null) => void;
};

const PlusUsageContext = createContext<PlusUsageContextValue | null>(null);

async function fetchAuthoritativeUsage(): Promise<
  { ok: true; usage: PlusUsage } | { ok: false; message: string }
> {
  try {
    const res = await fetch(PLUS_USAGE_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    const body = (await res.json().catch(() => null)) as
      | { data?: unknown; error?: { message?: string } }
      | null;
    if (!res.ok) {
      return {
        ok: false,
        message: body?.error?.message ?? PLUS_USAGE_REFRESH_ERROR,
      };
    }
    const usage = parsePlusUsage(body?.data);
    if (!usage) {
      return { ok: false, message: PLUS_USAGE_REFRESH_ERROR };
    }
    return { ok: true, usage };
  } catch {
    return { ok: false, message: PLUS_USAGE_REFRESH_ERROR };
  }
}

export function PlusUsageProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, loading: authLoading } = useAuth();
  const [usage, setUsage] = useState<PlusUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(createRefreshLock());

  const applyResult = useCallback(
    (result: { ok: true; usage: PlusUsage } | { ok: false; message?: string }) => {
      setUsage((previous) =>
        applyEntitlementRefreshResult(
          previous,
          result.ok ? { ok: true, usage: result.usage } : { ok: false },
        ),
      );
      if (result.ok) {
        setError(null);
        return result.usage;
      }
      setError(result.message ?? PLUS_USAGE_REFRESH_ERROR);
      return null;
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setUsage(null);
      return null;
    }
    return lockRef.current.run(async () => {
      setRefreshing(true);
      try {
        const result = await fetchAuthoritativeUsage();
        return applyResult(result);
      } finally {
        setRefreshing(false);
      }
    });
  }, [applyResult, isSignedIn]);

  const hydrate = useCallback((next: PlusUsage | null) => {
    setUsage((current) => current ?? next);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isSignedIn) {
      setUsage(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void lockRef.current
      .run(async () => {
        const result = await fetchAuthoritativeUsage();
        if (!cancelled) applyResult(result);
        return result;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyResult, authLoading, isSignedIn]);

  const value = useMemo<PlusUsageContextValue>(
    () => ({
      usage,
      loading: authLoading || loading,
      refreshing,
      error,
      refresh,
      hydrate,
    }),
    [authLoading, error, hydrate, loading, refresh, refreshing, usage],
  );

  return (
    <PlusUsageContext.Provider value={value}>{children}</PlusUsageContext.Provider>
  );
}

export function usePlusUsage(): PlusUsageContextValue {
  const ctx = useContext(PlusUsageContext);
  if (!ctx) {
    throw new Error("usePlusUsage must be used within PlusUsageProvider");
  }
  return ctx;
}
