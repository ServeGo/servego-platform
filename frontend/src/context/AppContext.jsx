import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UIProvider, useUI } from './UIContext';
import { DataProvider, useData } from './DataContext';
import { ToastProvider, useToast } from './ToastContext';
import { RealtimeProvider, useRealtime } from './RealtimeContext';

/**
 * Composition root for all global state, split by responsibility:
 *
 *   AuthProvider   -> session, currentUser, auth actions
 *   UIProvider     -> UI filters + global action spinner
 *   DataProvider   -> server/data state + data actions
 *   ToastProvider  -> transient toast notifications
 *   RealtimeProvider -> socket connection + live tracking state
 *
 * Pages consume only the slice they need via the granular hooks
 * (useAuth / useUI / useData / useRealtime). `useApp` is kept as a
 * backwards-compatible facade that merges every slice.
 */
export const AppProvider = ({ children }) => (
  <AuthProvider>
    <UIProvider>
      <DataProvider>
        <ToastProvider>
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </ToastProvider>
      </DataProvider>
    </UIProvider>
  </AuthProvider>
);

export const useApp = () => ({
  ...useAuth(),
  ...useUI(),
  ...useData(),
  ...useToast(),
  ...useRealtime(),
});

export { useAuth, useUI, useData, useToast, useRealtime };
