import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AIChat from '@/components/AIChat';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);

  // Keep the cart in sync with the session.
  useEffect(() => {
    if (!ready) return;
    useCartStore.getState().sync();
    if (user) useCartStore.getState().mergeGuestCart();
  }, [user, ready]);

  // GitHub Pages static demo: register the mock-API service worker.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_DEMO !== 'true') return;
    if (!('serviceWorker' in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    navigator.serviceWorker
      .register(`${base}/sw.js`)
      .then((reg) => {
        if (reg.active) reg.active.postMessage({ type: 'CACHE_DEMO_DATA', url: `${base}/demo-data.json` });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Component {...pageProps} />
      </main>
      <Footer />
      <AIChat />
      <Toaster
        position="top-center"
        toastOptions={{
          style: { borderRadius: '12px', fontSize: '14px', fontWeight: 500 },
        }}
      />
    </div>
  );
}
