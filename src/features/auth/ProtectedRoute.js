import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/UI';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <LoadingSpinner.Page text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default ProtectedRoute;