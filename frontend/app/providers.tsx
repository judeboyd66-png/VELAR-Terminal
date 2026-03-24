'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { SmoothScroll } from '@/components/shell/SmoothScroll'
import { ThemeProvider } from '@/components/shell/ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={280}>
          <SmoothScroll>
            {children}
          </SmoothScroll>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
