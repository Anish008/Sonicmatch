import { useEffect, useState } from 'react';

/**
 * Hook to check if the client-side hydration is complete.
 * This prevents hydration mismatches with Zustand persist middleware.
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
