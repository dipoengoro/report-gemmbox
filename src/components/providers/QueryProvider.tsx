"use client"; // Wajib karena TanStack Query bekerja di sisi browser (Client)

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Kita membuat satu instance QueryClient untuk seluruh aplikasi
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // Data dianggap segar selama 1 menit (tidak perlu ditarik ulang)
        refetchOnWindowFocus: false, // Jangan tarik data ulang hanya karena user pindah tab browser
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}