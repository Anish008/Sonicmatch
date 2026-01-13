'use client';

import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Add any providers here (e.g., QueryClientProvider, ThemeProvider)
  // Zustand doesn't need a provider as it uses hooks directly
  return <>{children}</>;
}
