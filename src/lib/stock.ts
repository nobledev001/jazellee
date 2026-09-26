import { supabase } from './supabaseClient';
import { PRODUCTS } from './catalog';

export interface CartStockItem {
  slug?: string;
  id?: string;
  name?: string;
  quantity: number;
}

export interface StockUpdateResult {
  updated: { slug: string; oldStock: number; newStock: number }[];
  lowStockItems: { name: string; slug: string; remaining: number }[];
  alreadyDecremented?: boolean;
}

interface ProductRecord {
  id?: string;
  slug?: string;
  name?: string;
  stock?: number;
  availability?: string;
  image?: string;
}

const LOW_STOCK_THRESHOLD = 5;

/**
 * Decreases product stock in Supabase and local cache upon successful checkout.
 * Database-level Idempotency:
 * 1. Checks and atomically claims stock decrement on the `orders` table (stock_decremented column).
 * 2. If already decremented by frontend callback or Paystack webhook on any device, skips immediately.
 * 3. Never decrements twice for the same order reference.
 */
export async function decreaseProductStock(
  items: CartStockItem[],
  orderReference?: string,
  paymentReference?: string
): Promise<StockUpdateResult> {
  const result: StockUpdateResult = { updated: [], lowStockItems: [] };

  // 1. Database-Level Idempotency Guard (Never localStorage-based)
  if (orderReference) {
    try {
      // Step A: Attempt atomic claim via database RPC function
      let claimed: boolean | null = null;
      let rpcError: unknown = null;

      const rpcResult1 = await supabase.rpc('claim_order_stock_decrement', {
        p_order_number: orderReference,
        p_payment_ref: paymentReference || '',
      });

      if (rpcResult1.error) {
        // Fall back to single-argument RPC signature if present
        const rpcResult2 = await supabase.rpc('claim_order_stock_decrement', {
          p_order_number: orderReference,
        });
        claimed = rpcResult2.data as boolean;
        rpcError = rpcResult2.error;
      } else {
        claimed = rpcResult1.data as boolean;
        rpcError = rpcResult1.error;
      }

      if (!rpcError && claimed === false) {
        console.warn(
          `[Stock Idempotency Guard] Order ${orderReference} was ALREADY marked as stock_decremented in database. Skipping duplicate decrement.`
        );
        result.alreadyDecremented = true;
        return result;
      }

      // Step B: Fallback check against orders table if RPC is not present
      if (rpcError) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('stock_decremented, status')
          .eq('order_number', orderReference)
          .maybeSingle();

        if (orderData?.stock_decremented === true) {
          console.warn(
            `[Stock Idempotency Guard] Database orders table reports stock_decremented=true for order ${orderReference}. Aborting duplicate decrement.`
          );
          result.alreadyDecremented = true;
          return result;
        }

        // Atomically set flag - exactly one concurrent process will update a row where stock_decremented was false
        const { data: updatedRows } = await supabase
          .from('orders')
          .update({
            stock_decremented: true,
            stock_decremented_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('order_number', orderReference)
          .eq('stock_decremented', false)
          .select('id');

        if (!updatedRows || updatedRows.length === 0) {
          console.warn(
            `[Stock Idempotency Guard] Order ${orderReference} stock decrement already claimed concurrently. Skipping duplicate decrement.`
          );
          result.alreadyDecremented = true;
          return result;
        }
      }
    } catch (guardErr) {
      console.warn('[Stock Idempotency Guard] Notice querying order database status:', guardErr);
    }
  }

  try {
    // 2. Fetch current product list from Supabase
    const { data: dbProducts } = await supabase.from('products').select('*');
    const productList: ProductRecord[] =
      dbProducts && dbProducts.length > 0 ? (dbProducts as ProductRecord[]) : (PRODUCTS as ProductRecord[]);

    for (const item of items) {
      const match = productList.find(
        (p) => (item.slug && p.slug === item.slug) || (item.id && p.id === item.id)
      );

      if (!match || !match.slug) continue;

      const currentStock = typeof match.stock === 'number' ? match.stock : 20;
      const newStock = Math.max(0, currentStock - item.quantity);
      const newAvailability = newStock > 10 ? 'In stock' : newStock > 0 ? 'Limited stock' : 'Back in stock';

      // Update in Supabase
      if (match.id) {
        await supabase
          .from('products')
          .update({
            stock: newStock,
            availability: newAvailability,
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.id);
      } else if (match.slug) {
        await supabase
          .from('products')
          .update({
            stock: newStock,
            availability: newAvailability,
            updated_at: new Date().toISOString(),
          })
          .eq('slug', match.slug);
      }

      result.updated.push({ slug: match.slug, oldStock: currentStock, newStock });

      if (newStock <= LOW_STOCK_THRESHOLD) {
        result.lowStockItems.push({
          name: match.name || match.slug,
          slug: match.slug,
          remaining: newStock,
        });
      }
    }

    // 3. Update local storage storefront cache immediately
    try {
      const localKey = 'jazelle_db_products';
      const rawStored = localStorage.getItem(localKey);
      if (rawStored) {
        const stored: ProductRecord[] = JSON.parse(rawStored);
        if (Array.isArray(stored) && stored.length > 0) {
          const updatedLocal = stored.map((p) => {
            const upd = result.updated.find((u) => u.slug === p.slug);
            if (upd) {
              const avail = upd.newStock > 10 ? 'In stock' : upd.newStock > 0 ? 'Limited stock' : 'Back in stock';
              return { ...p, stock: upd.newStock, availability: avail };
            }
            return p;
          });
          localStorage.setItem(localKey, JSON.stringify(updatedLocal));
        }
      }
    } catch {
      // ignore
    }

    // 4. Emit event so any storefront components refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('jazelle_stock_decreased', {
          detail: result,
        })
      );
    }
  } catch (err) {
    console.warn('[Stock] Error updating product stock:', err);
  }

  return result;
}

/**
 * Checks all products for low stock items (<= 5 units)
 */
export async function getLowStockAlerts(): Promise<{ name: string; slug: string; stock: number; image?: string }[]> {
  try {
    const { data } = await supabase.from('products').select('*');
    const list: ProductRecord[] =
      data && data.length > 0 ? (data as ProductRecord[]) : (PRODUCTS as ProductRecord[]);
    return list
      .map((p) => ({
        name: p.name || '',
        slug: p.slug || '',
        stock: typeof p.stock === 'number' ? p.stock : 15,
        image: p.image,
      }))
      .filter((p) => p.stock <= LOW_STOCK_THRESHOLD);
  } catch {
    return [];
  }
}
