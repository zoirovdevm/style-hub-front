'use client';

import { ApolloClientProvider } from '@/lib/apollo/provider';
import { ReactQueryProvider } from '@/lib/react-query/provider';
import { ThemeInitializer } from './ThemeInitializer';
import { PresenceProvider } from '@/lib/hooks/use-presence';
import { PresenceBeacon } from './PresenceBeacon';
import { RouteProgressBar } from './RouteProgressBar';
import { PerfDebugOverlay } from './PerfDebugOverlay';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <ApolloClientProvider>
        <PresenceProvider>
          <RouteProgressBar />
          <PresenceBeacon />
          <ThemeInitializer />
          {/* Renders nothing unless the URL has ?perfdebug=1 — see the
              component for why: real on-device timing numbers for
              diagnosing the iOS-only slowness, with zero effect on normal
              visitors. */}
          <PerfDebugOverlay />
          {children}
        </PresenceProvider>
      </ApolloClientProvider>
    </ReactQueryProvider>
  );
}
