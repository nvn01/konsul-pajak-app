'use client';

import type { PropsWithChildren } from 'react';
import { SessionProvider } from 'next-auth/react';

import { TRPCReactProvider } from 'nvn/trpc/react';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </SessionProvider>
  );
}

