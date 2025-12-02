"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PropsWithChildren, useState } from "react";

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 phút (giảm refetch không cần thiết)
            gcTime: 1000 * 60 * 30, // 30 phút cache (giữ data trong memory lâu hơn)
            refetchOnWindowFocus: false, // Không refetch khi đổi tab
            refetchOnReconnect: false, // Không refetch khi reconnect network
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
