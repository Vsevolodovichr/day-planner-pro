import { useEffect } from 'react';

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function useTopManagerPwaBadge(role: string | null | undefined) {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const badgeNavigator = navigator as BadgeNavigator;
    if (role === 'top_manager') {
      void badgeNavigator.setAppBadge?.(1).catch(() => {});
      return;
    }

    void badgeNavigator.clearAppBadge?.().catch(() => {});
  }, [role]);
}
