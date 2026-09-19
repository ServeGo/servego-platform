import React, { useEffect, useRef } from 'react';
import AdminDashboardPanel from '../../../../src/components/admin/AdminDashboardPanel';
import { useData } from '../../../context/AppContext';

// Thin wrapper for the landing tab. The dashboard summary cards read the shared
// bookings list, and the realtime poll now only refetches it while the socket
// is down (rule 23 — socket events are the live path), so refresh the list once
// per dashboard visit to keep counts and recent-bookings current. Guard so
// React StrictMode's dev double-mount does not fire that fetch twice.
export default function AdminDashboardTab(props) {
  const { fetchBookings } = useData();
  const fetchedOnceRef = useRef(false);
  useEffect(() => {
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AdminDashboardPanel {...props} />;
}