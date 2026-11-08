import { QueryClient } from '@tanstack/react-query'

/**
 * Stale-while-revalidate: cached data is shown instantly and refreshed from the
 * server in the background. Retries are handled by the axios client (cold starts).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})
