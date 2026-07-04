'use client';

import { ApolloClientProvider } from '@/lib/apollo/provider';
import { ReactQueryProvider } from '@/lib/react-query/provider';
import { ThemeInitializer } from './ThemeInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <ApolloClientProvider>
        <ThemeInitializer />
        {children}
      </ApolloClientProvider>
    </ReactQueryProvider>
  );
}
