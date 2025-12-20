import { QueryClient, type QueryFunction } from "@tanstack/react-query";

/**
 * Parse error response and throw user-friendly error
 * Handles rate limiting (429) with Retry-After header
 */
export async function handleResponseError(res: Response): Promise<never> {
  // Handle rate limiting with user-friendly message
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const seconds = retryAfter ? parseInt(retryAfter, 10) : 60;
    throw new Error(
      `Too many requests. Please wait ${seconds} seconds before trying again.`,
    );
  }

  // Try to parse error from response body
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      const json = JSON.parse(text);
      const message = json.error || json.message;
      if (message) {
        throw new Error(message);
      }
    } catch (e) {
      // If it's already our Error, rethrow it
      if (e instanceof Error && e.message !== text) {
        throw e;
      }
      // Otherwise use the raw text
      throw new Error(text);
    }
  }

  throw new Error(res.statusText || `Request failed with status ${res.status}`);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    await handleResponseError(res);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
