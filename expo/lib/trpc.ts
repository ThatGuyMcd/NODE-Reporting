import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!url) {
    console.warn('EXPO_PUBLIC_RORK_API_BASE_URL is not set, using fallback');
    return '';
  }
  return url;
};

const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: getBaseUrl() + '/api/trpc',
      transformer: superjson,
      fetch: fetchWithTimeout,
    }),
  ],
});
