/**
 * RefreshContext
 * ---------------
 * Centralized mechanism to force re-fetch or re-render
 * across multiple components without prop drilling.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface RefreshContextType {
  refreshKey: number;
  refresh: () => void;
  isRefreshing: boolean;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const RefreshProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Triggers a global refresh cycle
   */
  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);

    // Allow animations / loaders to complete
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  return (
    <RefreshContext.Provider value={{ refreshKey, refresh, isRefreshing }}>
      {children}
    </RefreshContext.Provider>
  );
};

/**
 * Hook guard to ensure provider usage
 */
export const useRefresh = () => {
  const context = useContext(RefreshContext);

  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }

  return context;
};