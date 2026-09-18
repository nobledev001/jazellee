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
import AboutPage from '@/components/AboutPage';
import FAQPage from '@/components/FAQPage';
import ContactPage from '@/components/ContactPage';
import CartPage from '@/components/CartPage';
import CheckoutPage from '@/components/CheckoutPage';
import OrderConfirmationPage from '@/components/OrderConfirmationPage';
import TrackOrderPage from '@/components/TrackOrderPage';
import AccountPage from '@/components/AccountPage';
import { AuthProvider } from '@/lib/auth';
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
    return <ShopPage initialSearch={search.get('search') ?? ''} initialCategory={categoryParam && (['Skincare', 'Body Care', 'Self-Care', 'Grooming'] as const).includes(categoryParam) ? categoryParam : 'All'} />;
  }
  if (path.startsWith('/product/')) return <ProductDetailPage slug={path.split('/')[2]} />;
  if (path === '/login') return <AuthPage mode="login" />;
  if (path === '/signup') return <AuthPage mode="signup" />;
  if (path === '/forgot-password') return <AuthPage mode="forgot" />;
  if (path === '/account') return <AccountPage />;
  if (path === '/journal') return <JournalPage />;
  if (path === '/about') return <AboutPage />;
  if (path === '/faq' || path === '/faqs') return <FAQPage />;
  if (path === '/contact') return <ContactPage />;
  if (path === '/cart') return <CartPage />;
  if (path === '/checkout') return <CheckoutPage />;
  if (path === '/order-confirmation') return <OrderConfirmationPage />;
  if (path === '/track-order') return <TrackOrderPage />;
  return <HomePage />;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

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
    <AuthProvider>
      <StoreProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
