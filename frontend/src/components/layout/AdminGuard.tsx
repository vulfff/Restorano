import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function AdminGuard({ children }: Props) {
  const { isAdmin } = useAuthStore();
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
