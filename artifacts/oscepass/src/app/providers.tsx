import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@workspace/api-client-react';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/AuthProvider';

/** Do not retry client errors (404, 429...): they will not fix themselves. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider>{children}<Toaster /></TooltipProvider></AuthProvider></QueryClientProvider>;
}
