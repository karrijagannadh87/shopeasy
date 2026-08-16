/**
 * Cart store — one cart, two backends:
 *  - logged in  → server cart (PostgreSQL via /api/cart)
 *  - guest      → localStorage cart, merged into the server cart on login
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { useAuthStore } from './authStore';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],          // server items [{product_id, quantity, name, price, image_url, stock, slug}]
      guestItems: [],     // [{product_id, quantity}]
      loading: false,

      count() {
        const { items, guestItems } = get();
        const src = useAuthStore.getState().user ? items : guestItems;
        return src.reduce((s, i) => s + Number(i.quantity || 0), 0);
      },

      subtotal() {
        const { items, guestItems } = get();
        const src = useAuthStore.getState().user ? items : guestItems;
        return src.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
      },

      async sync() {
        if (!useAuthStore.getState().user) return;
        set({ loading: true });
        try {
          const { data } = await api.get('/cart');
          set({ items: data.items, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      async mergeGuestCart() {
        const { guestItems } = get();
        if (!guestItems.length) return;
        try {
          await api.post('/cart/merge', { items: guestItems });
          set({ guestItems: [] });
          await get().sync();
        } catch {
          /* server cart still works */
        }
      },

      async add(product, quantity = 1) {
        if (useAuthStore.getState().user) {
          const { data } = await api.post('/cart', {
            product_id: product.id,
            quantity,
          });
          set({ items: data.items });
        } else {
          const { guestItems } = get();
          const existing = guestItems.find((i) => Number(i.product_id) === Number(product.id));
          const next = existing
            ? guestItems.map((i) =>
                Number(i.product_id) === Number(product.id)
                  ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock || 99) }
                  : i
              )
            : [...guestItems, { product_id: product.id, quantity, price: product.price, name: product.name, image_url: product.image_url, stock: product.stock, slug: product.slug }];
          set({ guestItems: next });
        }
      },

      async updateQuantity(productId, quantity) {
        if (useAuthStore.getState().user) {
          const { data } = await api.patch(`/cart/${productId}`, { quantity });
          set({ items: data.items });
        } else {
          set({
            guestItems: get().guestItems
              .map((i) =>
                Number(i.product_id) === Number(productId)
                  ? { ...i, quantity: Math.max(1, quantity) }
                  : i
              )
              .filter((i) => i.quantity > 0),
          });
        }
      },

      async remove(productId) {
        if (useAuthStore.getState().user) {
          const { data } = await api.delete(`/cart/${productId}`);
          set({ items: data.items });
        } else {
          set({ guestItems: get().guestItems.filter((i) => Number(i.product_id) !== Number(productId)) });
        }
      },

      clear() {
        set({ items: [], guestItems: [] });
      },
    }),
    {
      name: 'shopeasy-cart',
      partialize: (s) => ({ guestItems: s.guestItems }),
    }
  )
);

// Wire login/logout to cart sync.
if (typeof window !== 'undefined') {
  window.addEventListener('shopeasy:login', () => {
    useCartStore.getState().mergeGuestCart();
  });
  window.addEventListener('shopeasy:logout', () => {
    useCartStore.setState({ items: [] });
  });
}
