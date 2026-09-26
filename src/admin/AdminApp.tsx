import { useState, type ReactNode } from 'react';
import { AdminAuthProvider, useAdminAuth } from './AdminAuth';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminCoupons from './pages/AdminCoupons';
import AdminCustomers from './pages/AdminCustomers';
import AdminReviews from './pages/AdminReviews';
import AdminContent from './pages/AdminContent';

export type AdminRoute =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'coupons'
  | 'customers'
  | 'reviews'
  | 'content';

function parseHash(): AdminRoute {
  const hash = window.location.hash.replace('#', '');
  const valid: AdminRoute[] = ['dashboard', 'products', 'orders', 'coupons', 'customers', 'reviews', 'content'];
  return (valid.includes(hash as AdminRoute) ? hash : 'dashboard') as AdminRoute;
}

function AdminAppContent() {
  const { loading, isAdmin } = useAdminAuth();
  const [route, setRoute] = useState<AdminRoute>(() => parseHash());

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="flex items-center gap-3 text-pink-400 text-sm">
          <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading admin dashboard…</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLogin />;
  }

  const navigate = (r: AdminRoute) => {
    window.location.hash = r;
    setRoute(r);
  };

  const pages: Record<AdminRoute, ReactNode> = {
    dashboard: <AdminDashboard />,
    products: <AdminProducts />,
    orders: <AdminOrders />,
    coupons: <AdminCoupons />,
    customers: <AdminCustomers />,
    reviews: <AdminReviews />,
    content: <AdminContent />,
  };

  return (
    <AdminLayout route={route} navigate={navigate}>
      {pages[route]}
    </AdminLayout>
  );
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminAppContent />
    </AdminAuthProvider>
  );
}
