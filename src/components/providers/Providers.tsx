'use client';

import { ApolloClientProvider } from '@/lib/apollo/provider';
import { ReactQueryProvider } from '@/lib/react-query/provider';
import { ThemeInitializer } from './ThemeInitializer';
import { PresenceProvider } from '@/lib/hooks/use-presence';
import { PresenceBeacon } from './PresenceBeacon';
import { RouteProgressBar } from './RouteProgressBar';
import { ShopLoadingOverlay } from './ShopLoadingOverlay';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <ApolloClientProvider>
        <PresenceProvider>
          <RouteProgressBar />
          <ShopLoadingOverlay />
          <PresenceBeacon />
          <ThemeInitializer />
          {children}
        </PresenceProvider>
      </ApolloClientProvider>
    </ReactQueryProvider>
  );
}
