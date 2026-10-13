import type { Role } from '@workspace/auth-shared';

export interface AuthContext {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: Role;
    twoFactorEnabled: boolean;
  };
  session: { id: string; token: string; expiresAt: Date };
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
