import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Always reset scroll on pathname change. If navigating only by hash, do not reset.
    try {
      if (location && location.pathname) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    } catch (err) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.key]);

  return null;
}
