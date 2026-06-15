import { Platform, Linking } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  restorePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getReceiptIOS,
  showManageSubscriptionsIOS,
  type ProductSubscriptionIOS,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';

export const APPLE_IAP_PRODUCTS = {
  monthly: 'com.mayari.app.pro.monthly',
  yearly: 'com.mayari.app.pro.yearly',
} as const;

export type AppleIAPPlan = keyof typeof APPLE_IAP_PRODUCTS;

export interface IAPProduct {
  productId: string;
  displayPrice: string;
}

async function verifyAndActivate(purchase: Purchase, queryClient: ReturnType<typeof useQueryClient>) {
  try {
    const receipt = await getReceiptIOS();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await supabase.functions.invoke('apple-iap-verify', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { receipt, product_id: purchase.productId },
    });

    if (!res.error) {
      await finishTransaction({ purchase, isConsumable: false });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } else {
      console.error('IAP verify failed:', res.error);
    }
  } catch (err) {
    console.error('IAP purchase handler:', err);
  }
}

export type IAPStatus = 'idle' | 'initializing' | 'ready' | 'unavailable';

export function useAppleIAP() {
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [status, setStatus] = useState<IAPStatus>(Platform.OS === 'ios' ? 'initializing' : 'idle');
  const [initError, setInitError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const queryClient = useQueryClient();
  const purchaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPurchaseTimeout = useCallback(() => {
    if (purchaseTimeoutRef.current) {
      clearTimeout(purchaseTimeoutRef.current);
      purchaseTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let purchaseListener: ReturnType<typeof purchaseUpdatedListener>;
    let errorListener: ReturnType<typeof purchaseErrorListener>;

    async function init() {
      try {
        await initConnection();
        const subs = await fetchProducts({
          skus: Object.values(APPLE_IAP_PRODUCTS),
          type: 'subs',
        });
        const list = (subs ?? [])
          .filter((s): s is ProductSubscriptionIOS => 'platform' in s && s.platform === 'ios')
          .map((s) => ({ productId: s.id, displayPrice: s.displayPrice }));

        setProducts(list);

        if (list.length === 0) {
          setStatus('unavailable');
          setInitError(
            'Subscriptions are not available right now. Please check your connection and try again.',
          );
        } else {
          setStatus('ready');
          setInitError(null);
        }
      } catch (err) {
        console.warn('IAP init:', err);
        setStatus('unavailable');
        setInitError(
          err instanceof Error
            ? `Could not load subscriptions: ${err.message}`
            : 'Could not load subscriptions from the App Store.',
        );
      }
    }

    purchaseListener = purchaseUpdatedListener(async (purchase: Purchase) => {
      clearPurchaseTimeout();
      try {
        await verifyAndActivate(purchase, queryClient);
        setLastError(null);
      } catch (err) {
        setLastError(err instanceof Error ? err.message : 'Could not verify purchase.');
      } finally {
        setPurchasing(false);
      }
    });

    errorListener = purchaseErrorListener((err: PurchaseError) => {
      clearPurchaseTimeout();
      setPurchasing(false);
      if (err.code !== 'E_USER_CANCELLED' as never) {
        console.warn('IAP error:', err);
        setLastError(err.message ?? `Purchase failed (${err.code ?? 'unknown'})`);
      }
    });

    init();

    return () => {
      clearPurchaseTimeout();
      purchaseListener.remove();
      errorListener.remove();
      endConnection();
    };
  }, [queryClient, clearPurchaseTimeout]);

  const purchase = useCallback(async (plan: AppleIAPPlan) => {
    setLastError(null);
    if (status !== 'ready') {
      const msg = initError ?? 'Subscriptions are not ready yet. Please try again in a moment.';
      setLastError(msg);
      throw new Error(msg);
    }
    setPurchasing(true);
    // Safety net: if StoreKit never resolves (modal fails to present, system
    // race), unstick the button after 60s so the user is not trapped at
    // "Processing…". The listeners normally clear this much sooner.
    clearPurchaseTimeout();
    purchaseTimeoutRef.current = setTimeout(() => {
      purchaseTimeoutRef.current = null;
      setPurchasing(false);
      setLastError(
        'The App Store did not respond. Please check your connection and try again.',
      );
    }, 60_000);
    try {
      await requestPurchase({
        request: { apple: { sku: APPLE_IAP_PRODUCTS[plan] } },
        type: 'subs',
      });
      // success/failure is delivered via purchaseUpdatedListener / purchaseErrorListener.
      // The listeners clear `purchasing` and the timeout.
    } catch (err: unknown) {
      clearPurchaseTimeout();
      setPurchasing(false);
      const code = (err as { code?: string }).code;
      if (code === 'E_USER_CANCELLED') return;
      const msg = err instanceof Error ? err.message : 'Purchase failed.';
      setLastError(msg);
      throw err;
    }
  }, [status, initError, clearPurchaseTimeout]);

  const restore = useCallback(async () => {
    setRestoring(true);
    try {
      // Triggers purchaseUpdatedListener for each active purchase,
      // which calls apple-iap-verify and refreshes the subscription.
      await restorePurchases();
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } finally {
      setRestoring(false);
    }
  }, [queryClient]);

  const openManageSubscriptions = useCallback(async () => {
    try {
      await showManageSubscriptionsIOS();
    } catch {
      // Fallback if showManageSubscriptionsIOS fails (older iOS)
      Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
    }
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  return {
    products,
    status,
    initError,
    lastError,
    clearError,
    purchase,
    restore,
    restoring,
    purchasing,
    openManageSubscriptions,
  };
}
