import React from 'react';
import AdminSettingsPanel from '../../../../src/components/admin/AdminSettingsPanel';
import AdminPlatformControls from '../../../../src/components/admin/AdminPlatformControls';

export default function AdminSettingsTab(props) {
  return (
    <div className="space-y-10">
      <AdminSettingsPanel {...props} />
      <AdminPlatformControls />
    </div>
  );
}
