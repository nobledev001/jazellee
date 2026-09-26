import { useState, useEffect, type ReactNode } from 'react';
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
  Menu,
  X,
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
  const { signOut, profile, user } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile drawer on Escape key or route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [route]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentNavLabel = NAV_ITEMS.find((i) => i.route === route)?.label || 'Dashboard';
  const displayEmail = profile?.email || user?.email || 'admin@jazelle.com';
  const displayRole = profile?.role === 'owner' || displayEmail === 'admin@jazelle.com' ? 'Owner' : 'Admin';

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-gray-50">
      {/* Mobile & Tablet Top Header (< 1024px) */}
      <header className="lg:hidden flex items-center justify-between px-4 h-16 bg-gray-900 text-white border-b border-gray-800 shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center justify-center w-11 h-11 -ml-1 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/images/jazelle_wordmark_transparent.png"
              alt="Jazelle Skin Haven"
              className="h-6 w-auto object-contain brightness-0 invert opacity-95 shrink-0"
            />
            <span className="text-gray-600 hidden xs:inline">/</span>
            <span className="text-xs font-semibold text-pink-400 truncate">{currentNavLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 transition-colors min-h-[38px]"
          >
            <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden xs:inline">Store</span>
          </a>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Slide-over Drawer on < 1024px, Fixed Column on >= 1024px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[82vw] bg-gray-900 text-gray-300 flex flex-col flex-shrink-0 transform transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:max-w-none lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <img
              src="/assets/images/jazelle_wordmark_transparent.png"
              alt="Jazelle Skin Haven"
              className="h-8 w-auto object-contain object-left brightness-0 invert opacity-95"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="text-pink-400 font-medium text-[10px] tracking-widest uppercase">Owner Portal</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = route === item.route;
            return (
              <button
                key={item.route}
                onClick={() => {
                  navigate(item.route);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 lg:py-2.5 rounded-xl lg:rounded-lg text-sm font-medium transition-colors cursor-pointer min-h-[44px] ${
                  active
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-3 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors min-h-[42px]"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            <span>View Store</span>
          </a>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer min-h-[42px]"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
          <div className="px-3.5 pt-2 pb-1 text-xs text-gray-500">
            Signed in as <span className="text-gray-300 font-medium">{displayRole}</span>
            <div className="text-[11px] text-gray-400 font-mono truncate">{displayEmail}</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
