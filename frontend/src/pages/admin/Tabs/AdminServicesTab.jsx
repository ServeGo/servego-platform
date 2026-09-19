import React, { useEffect, useRef } from 'react';
import AdminServicesPanel from '../../../../src/components/admin/AdminServicesPanel';
import { useData } from '../../../context/AppContext';

// Thin wrapper to keep tab responsibilities isolated. Fetches the admin
// services list (hidden categories included) lazily on first mount instead of
// loading it with the rest of the admin panel — the list rendered while it
// loads falls back to the public catalog already in memory, so the tab shows
// content instantly and the hidden rows appear when the fetch lands.
export default function AdminServicesTab(props) {
  const { fetchAdminServices } = useData();

  // Guard so React StrictMode's dev double-mount does not fire the same request
  // twice (real re-mounts get a fresh ref).
  const fetchOnceRef = useRef(false);
  useEffect(() => {
    if (fetchOnceRef.current) return;
    fetchOnceRef.current = true;
    fetchAdminServices();
  }, [fetchAdminServices]);

  return <AdminServicesPanel {...props} />;
}

