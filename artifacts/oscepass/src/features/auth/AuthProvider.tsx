import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { hasPermission, normaliseRole, type Permission, type Role } from '@workspace/auth-shared';
import { authClient } from '@/lib/auth-client';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  twoFactorEnabled: boolean;
  deletionScheduledAt: string | null;
}

interface AuthState {
  user: CurrentUser | null;
  sessionToken: string | null;
  isPending: boolean;
  can: (permission: Permission) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, refetch } = authClient.useSession();

  const user = useMemo<CurrentUser | null>(() => {
    if (!data?.user) return null;
    const u = data.user as typeof data.user & {
      role?: unknown;
      twoFactorEnabled?: boolean | null;
      deletionScheduledAt?: string | Date | null;
    };
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      role: normaliseRole(u.role),
      twoFactorEnabled: !!u.twoFactorEnabled,
      deletionScheduledAt: u.deletionScheduledAt ? new Date(u.deletionScheduledAt).toISOString() : null,
    };
  }, [data]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    await refetch();
  }, [refetch]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      sessionToken: data?.session?.token ?? null,
      isPending,
      can: (permission) => !!user && hasPermission(user.role, permission),
      refresh,
      signOut,
    }),
    [user, data?.session?.token, isPending, refresh, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
