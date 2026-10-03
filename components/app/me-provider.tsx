"use client";

import { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import { getMe, paths } from "@/lib/api-client";
import { useApi } from "@/lib/hooks/use-api";
import type { Me, Role } from "@/lib/types";

type MeContextValue = {
  me: Me | null;
  role: Role | null;
  name: string;
  email: string;
  workspaceName: string | null;
  loading: boolean;
  /** ANALYST + ADMIN: ingest, edit, classify, themes, reports. */
  canEdit: boolean;
  /** ADMIN only: members, delete themes and reports. */
  isAdmin: boolean;
  refetch: () => void;
};

const MeContext = createContext<MeContextValue | null>(null);

/** Fetches GET /api/me once for the app shell; the NextAuth session is the fallback while it loads. */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { data: me, loading, refetch } = useApi<Me>(paths.me(), (signal) => getMe(signal));

  const value = useMemo<MeContextValue>(() => {
    const role = me?.role ?? session?.user?.role ?? null;
    return {
      me,
      role,
      name: me?.name ?? session?.user?.name ?? "",
      email: me?.email ?? session?.user?.email ?? "",
      workspaceName: me?.workspace.name ?? null,
      loading,
      canEdit: role === "ADMIN" || role === "ANALYST",
      isAdmin: role === "ADMIN",
      refetch: () => refetch({ silent: true }),
    };
  }, [me, session, loading, refetch]);

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used inside <MeProvider>");
  return ctx;
}
