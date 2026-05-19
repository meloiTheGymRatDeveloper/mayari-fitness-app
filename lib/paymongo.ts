// PayMongo integration — implemented in Week 6
// Public key is safe to expose; secret key lives only in Supabase Edge Functions.
const PAYMONGO_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY ?? '';

export const paymongo = {
  publicKey: PAYMONGO_PUBLIC_KEY,
};
