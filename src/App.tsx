import { useState } from 'react';
import { RouterProvider, useRouter } from '@/router';
import { StoreProvider } from '@/store/StoreContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import Countdown from '@/components/Countdown';
import JazellePicks from '@/components/JazellePicks';
import ShopByConcern from '@/components/ShopByConcern';
import NeedHelpChoosing from '@/components/NeedHelpChoosing';
import FollowTheHaven from '@/components/FollowTheHaven';
import WhatsAppButton from '@/components/WhatsAppButton';
import SplashScreen from '@/components/SplashScreen';
import ShopPage from '@/components/ShopPage';
import ProductDetailPage from '@/components/ProductDetailPage';
import AuthPage from '@/components/AuthPage';
import JournalPage from '@/components/JournalPage';
import ArticleDetailPage from '@/components/ArticleDetailPage';
import AboutPage from '@/components/AboutPage';
import FAQPage from '@/components/FAQPage';
import ContactPage from '@/components/ContactPage';
import CartPage from '@/components/CartPage';
import CheckoutPage from '@/components/CheckoutPage';
import OrderConfirmationPage from '@/components/OrderConfirmationPage';
import TrackOrderPage from '@/components/TrackOrderPage';
import AccountPage from '@/components/AccountPage';
import PolicyPage from '@/components/PolicyPage';
import AdminApp from '@/admin/AdminApp';
import { AuthProvider } from '@/lib/auth';
import { SiteSettingsProvider } from '@/context/SiteSettingsContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { Category } from '@/lib/catalog';

function HomePage() {
  return (
    <>
      <Hero />
      <Countdown />
      <JazellePicks />
      <ShopByConcern />
      <NeedHelpChoosing />
      <FollowTheHaven />
    </>
  );
}

function Routes() {
  const { path, search } = useRouter();

  if (path === '/') return <HomePage />;
  if (path === '/shop') {
    const categoryParam = search.get('category') as Category | null;
    const concernParam = search.get('concern');
    const concernMap: Record<string, string> = {
      'dark-spots': 'dark spots',
      'dry-skin': 'moistur',
      'uneven-tone': 'tone',
      'body-bumps': 'smooth',
      'dull-skin': 'glow',
      'sun-protection': 'sun',
      'soft-fresh': 'soft',
    };
    const concernSearch = concernParam ? concernMap[concernParam] || concernParam.replace('-', ' ') : '';
    const initialSearch = search.get('search') ?? concernSearch;
    return <ShopPage initialSearch={initialSearch} initialCategory={categoryParam && (['Skincare', 'Body Care', 'Self-Care', 'Grooming'] as const).includes(categoryParam) ? categoryParam : 'All'} />;
  }

  // Category direct routes
  if (path === '/categories/skincare' || path === '/category/skincare' || path === '/skincare') {
    return <ShopPage initialSearch="" initialCategory="Skincare" />;
  }
  if (
    path === '/categories/body-care' ||
    path === '/categories/bodycare' ||
    path === '/category/body-care' ||
    path === '/category/bodycare' ||
    path === '/body-care' ||
    path === '/bodycare'
  ) {
    return <ShopPage initialSearch="" initialCategory="Body Care" />;
  }
  if (path === '/categories/grooming' || path === '/category/grooming' || path === '/grooming') {
    return <ShopPage initialSearch="" initialCategory="Grooming" />;
  }
  if (
    path === '/categories/self-care' ||
    path === '/categories/selfcare' ||
    path === '/category/self-care' ||
    path === '/category/selfcare' ||
    path === '/self-care' ||
    path === '/selfcare'
  ) {
    return <ShopPage initialSearch="" initialCategory="Self-Care" />;
  }
  if (path === '/categories' || path === '/category') {
    return <ShopPage initialSearch="" initialCategory="All" />;
  }

  if (path.startsWith('/product/')) return <ProductDetailPage slug={path.split('/')[2]} />;
  if (path === '/login') return <AuthPage mode="login" />;
  if (path === '/signup') return <AuthPage mode="signup" />;
  if (path === '/forgot-password') return <AuthPage mode="forgot" />;
  if (path === '/account') return <AccountPage />;
  if (path.startsWith('/journal/')) {
    const slug = path.split('/')[2];
    if (slug) return <ArticleDetailPage slug={slug} />;
  }
  if (path === '/journal') return <JournalPage />;
  if (path === '/about') return <AboutPage />;
  if (path === '/faq' || path === '/faqs') return <FAQPage />;
  if (path === '/contact') return <ContactPage />;
  if (path === '/cart') return <CartPage />;
  if (path === '/checkout') return <CheckoutPage />;
  if (path === '/order-confirmation') return <OrderConfirmationPage />;
  if (path === '/track-order') return <TrackOrderPage />;
  if (path === '/shipping') return <PolicyPage policy="shipping" />;
  if (path === '/returns') return <PolicyPage policy="returns" />;
  if (path === '/privacy') return <PolicyPage policy="privacy" />;
  if (path === '/terms') return <PolicyPage policy="terms" />;
  return <HomePage />;
}

function AppContent() {
  const { path } = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  if (path === '/admin' || path === '/admin.html' || path.startsWith('/admin/')) {
    return <AdminApp />;
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes />
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SiteSettingsProvider>
          <StoreProvider>
            <RouterProvider>
              <AppContent />
            </RouterProvider>
          </StoreProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
