import { useEffect, useRef, useState } from 'react';
import {
  Search,
  User,
  ShoppingBag,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';
import Logo from '@/components/Logo';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface NavLink {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  {
    label: 'Categories',
    href: '/categories',
    children: [
      { label: 'Skincare', href: '/categories/skincare' },
      { label: 'Body Care', href: '/categories/body-care' },
      { label: 'Grooming', href: '/categories/grooming' },
      { label: 'Self Care', href: '/categories/self-care' },
    ],
  },
  { label: 'Journal', href: '/journal' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount } = useStore();
  const { user } = useAuth();
  const [cartPulse, setCartPulse] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { getSetting } = useSiteSettings();
  const announcementText = getSetting(
    'announcement_bar',
    'Free delivery on orders over ₦40,000 — across Nigeria'
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (cartCount > 0) {
      setCartPulse(true);
      const t = setTimeout(() => setCartPulse(false), 400);
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-berry-700 text-cream-100 text-center text-xs sm:text-sm py-2.5 px-4 font-medium tracking-wide">
        <span className="inline-flex items-center gap-1.5">
          {announcementText}
        </span>
      </div>

      {/* Main header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-cream-50/90 backdrop-blur-md shadow-soft'
            : 'bg-cream-50/60 backdrop-blur-sm'
        }`}
      >
        <div className="container-jazelle">
          <div className="flex items-center justify-between h-18 sm:h-20 md:h-22">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-berry-700 hover:text-blush-500 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo */}
            <a href="/" className="flex items-center group py-0.5" aria-label="Jazelle Skin Haven Home">
              <Logo
                size="header"
                className="transition-transform duration-300 group-hover:scale-[1.03] shrink-0 drop-shadow-xs"
              />
            </a>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <div key={link.label} className="relative group">
                  <a
                    href={link.href}
                    className="link-underline inline-flex items-center gap-0.5 px-4 py-2 text-base font-medium text-berry-700 hover:text-blush-500 transition-colors"
                  >
                    {link.label}
                    {link.children && (
                      <ChevronDown className="w-3.5 h-3.5 opacity-50 transition-transform duration-200 group-hover:rotate-180" />
                    )}
                  </a>
                  {link.children && (
                    <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                      <div className="w-52 rounded-3xl bg-white shadow-soft-lg border border-blush-100 p-2">
                        {link.children.map((child) => (
                          <a
                            key={child.label}
                            href={child.href}
                            className="block px-4 py-2.5 text-sm font-medium text-berry-600 rounded-2xl hover:bg-blush-50 hover:text-blush-500 transition-colors"
                          >
                            {child.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-full text-berry-700 hover:bg-blush-50 hover:text-blush-500 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <a
                href={user ? "/account" : "/login"}
                className="hidden sm:flex p-2.5 rounded-full text-berry-700 hover:bg-blush-50 hover:text-blush-500 transition-colors"
                aria-label={user ? "Account" : "Sign in"}
              >
                <User className="w-5 h-5" />
              </a>

              <a
                href="/cart"
                className="relative p-2.5 rounded-full text-berry-700 hover:bg-blush-50 hover:text-blush-500 transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag
                  className={`w-5 h-5 ${cartPulse ? 'animate-cart-pop' : ''}`}
                />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-blush-500 text-white text-[0.65rem] font-bold leading-none">
                    {cartCount}
                  </span>
                )}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-berry-900/30 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-fade-in"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-cream-50 rounded-5xl shadow-soft-xl p-6 sm:p-8 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl font-medium text-berry-800">
                What are you looking for?
              </h3>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-2 rounded-full text-berry-500 hover:bg-blush-50 transition-colors"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blush-300" />
              <form onSubmit={(event) => { event.preventDefault(); const query = searchInputRef.current?.value.trim(); window.location.href = query ? `/shop?search=${encodeURIComponent(query)}` : '/shop'; }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for skincare, body care, self-care..."
                  className="input-jazelle pl-14"
                />
              </form>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Body oils', 'Lip care', 'Face masks', 'Gift sets', 'Bath salts'].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchOpen(false);
                      window.location.href = `/shop?search=${encodeURIComponent(term)}`;
                    }}
                    className="badge-jazelle hover:bg-blush-200 transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-berry-900/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-cream-50 shadow-soft-xl animate-slide-in-right flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-blush-100">
              <a href="/" onClick={() => setMobileOpen(false)} aria-label="Jazelle Skin Haven Home">
                <Logo size="header" className="shrink-0 drop-shadow-xs" />
              </a>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full text-berry-500 hover:bg-blush-50 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto p-5 space-y-1">
              {NAV_LINKS.map((link) => (
                <MobileNavItem
                  key={link.label}
                  link={link}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>

            {/* Bottom actions */}
            <div className="p-5 border-t border-blush-100 space-y-3">
              <a
                href={user ? "/account" : "/login"}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blush-50 text-berry-700 font-medium text-sm hover:bg-blush-100 transition-colors"
              >
                <User className="w-5 h-5" />
                {user ? "My Account" : "Sign In"}
              </a>
              <a
                href="/cart"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blush-500 text-white font-semibold text-sm hover:bg-blush-600 transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                View Cart ({cartCount})
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileNavItem({
  link,
  onNavigate,
}: {
  link: NavLink;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (link.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-berry-700 rounded-2xl hover:bg-blush-50 transition-colors"
        >
          {link.label}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        {expanded && (
          <div className="pl-4 space-y-1 animate-fade-in-down">
            {link.children.map((child) => (
              <a
                key={child.label}
                href={child.href}
                onClick={onNavigate}
                className="block px-4 py-2.5 text-sm font-medium text-berry-500 rounded-2xl hover:bg-blush-50 hover:text-blush-500 transition-colors"
              >
                {child.label}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={link.href}
      onClick={onNavigate}
      className="block px-4 py-3 text-base font-medium text-berry-700 rounded-2xl hover:bg-blush-50 hover:text-blush-500 transition-colors"
    >
      {link.label}
    </a>
  );
}
