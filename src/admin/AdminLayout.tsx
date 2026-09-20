import { type ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Ticket,
  Users,
  Star,
  FileText,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useAdminAuth } from './AdminAuth';
import type { AdminRoute } from './AdminApp';

const NAV_ITEMS: Array<{ route: AdminRoute; label: string; icon: typeof LayoutDashboard }> = [
  { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'products', label: 'Products', icon: Package },
  { route: 'orders', label: 'Orders', icon: ShoppingCart },
  { route: 'coupons', label: 'Coupons', icon: Ticket },
  { route: 'customers', label: 'Customers', icon: Users },
  { route: 'reviews', label: 'Reviews', icon: Star },
  { route: 'content', label: 'Content', icon: FileText },
];

export default function AdminLayout({
  route,
  navigate,
  children,
}: {
  route: AdminRoute;
  navigate: (r: AdminRoute) => void;
  children: ReactNode;
}) {
  const { profile, signOut } = useAdminAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center text-white font-bold text-sm">
              J
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Jazelle Admin</div>
              <div className="text-gray-500 text-xs">Skin Haven Dashboard</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = route === item.route;
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-pink-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-3 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            View Store
          </a>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
          <div className="px-3 pt-2 text-xs text-gray-600">
            Signed in as {profile?.email}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
