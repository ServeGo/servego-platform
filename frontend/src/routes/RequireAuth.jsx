import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const redirectByRole = {
  customer: '/dashboard',
  provider: '/provider-dashboard',
  admin: '/admin-dashboard',
};

const RequireAuth = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = redirectByRole[user.role] || '/';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default RequireAuth;
