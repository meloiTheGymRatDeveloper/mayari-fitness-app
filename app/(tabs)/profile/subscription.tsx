import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  typography,
  spacing,
  fonts,
  labelStyle,
} from "../../../constants/theme";
import {
  useSubscription,
  useCreatePaymentLink,
  useCancelSubscription,
} from "../../../hooks/useSubscription";
import {
  useMyReferrals,
  calcReferralDiscount,
} from "../../../hooks/useReferrals";
import { useAppleIAP } from "../../../hooks/useAppleIAP";
import { useAuthStore } from "../../../stores/authStore";

const BETA_PRICE = 50;
const MONTHLY_PRICE = 89;
const YEARLY_PRICE = 799;
const CONSISTENCY_DISCOUNT_PCT = 0.1;

const IS_IOS = Platform.OS === "ios";

// Required by Apple App Store Guideline 3.1.2(c): functional links to
// Privacy Policy and Terms of Use (EULA) must be present in the subscription
// purchase flow. Same URLs must also be set in App Store Connect metadata.
const PRIVACY_URL =
  "https://clever-antique-3e9.notion.site/Privacy-Policy-Mayari-3769e0aa488480b8a854c6ea6836be8d";
const TERMS_URL =
  "https://clever-antique-3e9.notion.site/Terms-of-Service-Mayari-37e9e0aa488480c0a34fdc0477114acd";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const PRO_FEATURES = [
  "Coach Mayari — personalised AI tips",
  "Photo calorie estimation",
  "Voice food logging (Tagalog/English)",
  "AI food lookup",
  "Intermittent fasting timer",
  "Advanced analytics dashboard",
  "Push notifications",
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: sub, isLoading, refetch } = useSubscription();
  const { data: referrals } = useMyReferrals();

  // Android — PayMongo
  const createPaymentLink = useCreatePaymentLink();
  const cancelSub = useCancelSubscription();
  const [selectedPlan, setSelectedPlan] = useState<
    "beta" | "monthly" | "yearly"
  >(IS_IOS ? "monthly" : "beta");
  const [opening, setOpening] = useState(false);

  // iOS — Apple IAP
  const {
    products,
    status: iapStatus,
    initError: iapInitError,
    lastError: iapLastError,
    clearError: clearIapError,
    purchase,
    restore,
    purchasing,
    restoring,
    openManageSubscriptions,
  } = useAppleIAP();

  // Surface IAP errors as alerts so the user (and App Review) sees them
  // instead of a silent "no response" tap.
  useEffect(() => {
    if (!IS_IOS || !iapLastError) return;
    Alert.alert("Purchase Error", iapLastError, [
      { text: "OK", onPress: clearIapError },
    ]);
  }, [iapLastError, clearIapError]);

  const isActive =
    sub?.tier === "beta" || sub?.tier === "active" || sub?.tier === "achiever";
  const paymentFailed =
    sub?.tier === "free" &&
    sub?.current_period_end != null &&
    new Date(sub.current_period_end) < new Date();

  // Discounts only apply to Android/PayMongo
  const referralDiscount = IS_IOS ? 0 : calcReferralDiscount(referrals);
  const consistencyDiscount = IS_IOS
    ? 0
    : sub?.consistency_discount_pct
      ? Math.round(MONTHLY_PRICE * CONSISTENCY_DISCOUNT_PCT)
      : 0;

  const monthlyFinal = Math.max(
    1,
    MONTHLY_PRICE - consistencyDiscount - referralDiscount,
  );
  const displayedPrice =
    selectedPlan === "yearly"
      ? YEARLY_PRICE
      : selectedPlan === "beta"
        ? BETA_PRICE
        : monthlyFinal;
  const yearlySaving = MONTHLY_PRICE * 12 - YEARLY_PRICE;

  // iOS: localized price from App Store. Returns null when products
  // are not loaded yet — the UI shows a loading / unavailable state instead.
  function getIosPrice(plan: "monthly" | "yearly"): string | null {
    const productId =
      plan === "monthly"
        ? "com.mayari.app.pro.monthly"
        : "com.mayari.app.pro.yearly";
    const found = products.find((p) => p.productId === productId);
    return found?.displayPrice ?? null;
  }

  async function handleOpenLegal(url: string) {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert("Could not open link", "Please try again.");
    }
  }

  async function handleAndroidSubscribe() {
    try {
      setOpening(true);
      const result = await createPaymentLink.mutateAsync(selectedPlan);
      await WebBrowser.openBrowserAsync(result.checkout_url);

      // PayMongo's webhook is asynchronous — when the browser closes, the
      // payment may have cleared on PayMongo's side but our DB row hasn't
      // been written yet. Poll for up to ~20s so the user reliably sees
      // Pro unlock without having to force-quit the app.
      const POLL_ATTEMPTS = 10;
      const POLL_INTERVAL_MS = 2000;
      for (let i = 0; i < POLL_ATTEMPTS; i++) {
        const { data } = await refetch();
        if (
          data?.tier === "beta" ||
          data?.tier === "active" ||
          data?.tier === "achiever"
        ) {
          // Refresh the cached users-row profile too. useFeatureAccess reads
          // subscription_status from authStore.profile (users table), not from
          // useSubscription (subscriptions table). Without this, Pro features
          // stay locked until the app is restarted.
          const userId = useAuthStore.getState().session?.user.id;
          if (userId) await useAuthStore.getState().fetchProfile(userId);
          return;
        }
        if (i < POLL_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
      }

      Alert.alert(
        "Payment received",
        "Your payment cleared but Pro is taking a moment to unlock. It should activate within a few minutes — pull down to refresh, or reopen this screen later.",
      );
    } catch (err: unknown) {
      Alert.alert(
        "Payment Error",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setOpening(false);
    }
  }

  async function handleIOSSubscribe() {
    const iosPlan = selectedPlan === "yearly" ? "yearly" : "monthly";
    try {
      await purchase(iosPlan);
      await refetch();
      const userId = useAuthStore.getState().session?.user.id;
      if (userId) await useAuthStore.getState().fetchProfile(userId);
    } catch {
      // Errors are surfaced through useAppleIAP's `lastError` state,
      // which the useEffect above turns into an Alert. Don't double-alert here.
    }
  }

  async function handleIOSRestore() {
    try {
      await restore();
      await refetch();
      const userId = useAuthStore.getState().session?.user.id;
      if (userId) await useAuthStore.getState().fetchProfile(userId);
      Alert.alert("Restore Complete", "Your purchases have been restored.");
    } catch {
      Alert.alert("Restore Failed", "Could not restore purchases. Try again.");
    }
  }

  function handleCancel() {
    if (IS_IOS) {
      Alert.alert(
        "Manage Subscription",
        "To cancel, go to your iPhone Settings → Apple ID → Subscriptions → Mayari.",
        [
          { text: "Open Settings", onPress: openManageSubscriptions },
          { text: "Dismiss", style: "cancel" },
        ],
      );
      return;
    }
    Alert.alert(
      "Cancel Subscription",
      `Your access continues until ${formatDate(sub?.current_period_end ?? null)}. Cancel anyway?`,
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSub.mutateAsync();
            } catch (err: unknown) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Could not cancel. Try again.",
              );
            }
          },
        },
      ],
    );
  }

  const isBusy = IS_IOS ? purchasing : opening || createPaymentLink.isPending;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Subscription</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator
          color={colors.brand.primary}
          style={{ marginTop: spacing.xl }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {paymentFailed && !IS_IOS && (
            <View style={styles.paymentFailedCard}>
              <Text style={styles.paymentFailedTitle}>⚠️ Payment failed</Text>
              <Text style={styles.paymentFailedBody}>
                Your last payment didn't go through. Resubscribe to restore
                access.
              </Text>
              <TouchableOpacity
                style={[styles.paymentFailedBtn, isBusy && styles.disabled]}
                onPress={handleAndroidSubscribe}
                disabled={isBusy}
              >
                <Text style={styles.paymentFailedBtnText}>Resubscribe</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Current plan */}
          <View style={[styles.planCard, isActive && styles.planCardActive]}>
            <Text style={styles.planLabel}>CURRENT PLAN</Text>
            <View style={styles.planRow}>
              <View>
                <Text style={styles.planTier}>{isActive ? "Pro" : "Free"}</Text>
                {isActive && sub?.current_period_end ? (
                  <Text style={styles.planSub}>
                    Renews {formatDate(sub.current_period_end)}
                  </Text>
                ) : (
                  <Text style={styles.planSub}>Limited features</Text>
                )}
              </View>
              <View
                style={[
                  styles.badge,
                  isActive ? styles.badgeActive : styles.badgeFree,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isActive ? styles.badgeTextActive : styles.badgeTextFree,
                  ]}
                >
                  {isActive ? "ACTIVE" : "FREE"}
                </Text>
              </View>
            </View>
          </View>

          {/* Pro plan offer (free users only) */}
          {!isActive && (
            <View style={styles.offerCard}>
              <Text style={styles.offerLabel}>🌙 MAYARI PRO</Text>

              {/* Plan toggle */}
              <View style={styles.planToggle}>
                {!IS_IOS && (
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      selectedPlan === "beta" && styles.toggleBtnActive,
                    ]}
                    onPress={() => setSelectedPlan("beta")}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        selectedPlan === "beta" && styles.toggleBtnTextActive,
                      ]}
                    >
                      Early Access
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    selectedPlan === "monthly" && styles.toggleBtnActive,
                  ]}
                  onPress={() => setSelectedPlan("monthly")}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      selectedPlan === "monthly" && styles.toggleBtnTextActive,
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    selectedPlan === "yearly" && styles.toggleBtnActive,
                  ]}
                  onPress={() => setSelectedPlan("yearly")}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      selectedPlan === "yearly" && styles.toggleBtnTextActive,
                    ]}
                  >
                    Yearly
                  </Text>
                  {yearlySaving > 0 && (
                    <Text style={styles.savingsBadge}>
                      Save ₱{yearlySaving}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Beta banner (Android only) */}
              {!IS_IOS && selectedPlan === "beta" && (
                <View style={styles.betaBanner}>
                  <Text style={styles.betaBannerText}>
                    💜 Early Access rate — renews at ₱{MONTHLY_PRICE}/month
                    after launch
                  </Text>
                </View>
              )}

              {/* Price display */}
              <View style={styles.offerPriceRow}>
                {IS_IOS ? (
                  iapStatus === "ready" ? (
                    <Text style={styles.offerPrice}>
                      {getIosPrice(
                        selectedPlan === "yearly" ? "yearly" : "monthly",
                      ) ?? "—"}
                    </Text>
                  ) : iapStatus === "initializing" ? (
                    <View style={styles.priceLoadingRow}>
                      <ActivityIndicator color={colors.brand.primary} />
                      <Text style={styles.priceLoadingText}>
                        Loading App Store pricing…
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.priceUnavailable}>
                      Subscriptions unavailable. Please check your connection.
                    </Text>
                  )
                ) : (
                  <>
                    <Text style={styles.offerPrice}>₱{displayedPrice}</Text>
                    <Text style={styles.offerPriceSub}>
                      {selectedPlan === "yearly" ? "/year" : "/month"}
                    </Text>
                  </>
                )}
              </View>

              {IS_IOS && iapStatus === "unavailable" && iapInitError && (
                <Text style={styles.iapErrorHint}>{iapInitError}</Text>
              )}

              {/* Discount breakdown (Android monthly only) */}
              {!IS_IOS &&
                selectedPlan === "monthly" &&
                (consistencyDiscount > 0 || referralDiscount > 0) && (
                  <View style={styles.discountBreakdown}>
                    <Text style={styles.discountLine}>
                      Regular price: ₱{MONTHLY_PRICE}/month
                    </Text>
                    {consistencyDiscount > 0 && (
                      <Text style={styles.discountLine}>
                        Consistency discount: −₱{consistencyDiscount}
                      </Text>
                    )}
                    {referralDiscount > 0 && (
                      <Text style={styles.discountLine}>
                        Referral discount: −₱{referralDiscount}
                      </Text>
                    )}
                  </View>
                )}

              {PRO_FEATURES.map((f) => (
                <Text key={f} style={styles.offerFeature}>
                  ✓ {f}
                </Text>
              ))}

              {(() => {
                const iosNotReady = IS_IOS && iapStatus !== "ready";
                const disabled = isBusy || iosNotReady;
                const iosPrice = IS_IOS
                  ? getIosPrice(
                      selectedPlan === "yearly" ? "yearly" : "monthly",
                    )
                  : null;

                let label: string;
                if (isBusy) {
                  label = IS_IOS ? "Processing…" : "Opening…";
                } else if (IS_IOS && iapStatus === "initializing") {
                  label = "Loading…";
                } else if (IS_IOS && iapStatus === "unavailable") {
                  label = "Unavailable";
                } else if (IS_IOS) {
                  label = iosPrice ? `Subscribe · ${iosPrice}` : "Subscribe";
                } else {
                  label = `Subscribe · ₱${displayedPrice}${selectedPlan === "yearly" ? "/year" : "/month"}`;
                }

                return (
                  <TouchableOpacity
                    style={[styles.subscribeBtn, disabled && styles.disabled]}
                    onPress={
                      IS_IOS ? handleIOSSubscribe : handleAndroidSubscribe
                    }
                    disabled={disabled}
                  >
                    <Text style={styles.subscribeBtnText}>{label}</Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Restore Purchases — required by Apple */}
              {IS_IOS && (
                <TouchableOpacity
                  style={[styles.restoreBtn, restoring && styles.disabled]}
                  onPress={handleIOSRestore}
                  disabled={restoring}
                >
                  <Text style={styles.restoreBtnText}>
                    {restoring ? "Restoring..." : "Restore Purchases"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Legal disclosure — required for Apple Guideline 3.1.2(c).
                  Auto-renewal explanation + functional Terms & Privacy links. */}
              <View style={styles.legalBlock}>
                {IS_IOS && (
                  <Text style={styles.legalDisclosure}>
                    Subscription auto-renews at the same price each
                    {selectedPlan === "yearly" ? " year" : " month"} until
                    cancelled at least 24 hours before the end of the current
                    period. Manage or cancel anytime in your Apple ID Settings.
                  </Text>
                )}
                <View style={styles.legalLinksRow}>
                  <TouchableOpacity onPress={() => handleOpenLegal(TERMS_URL)}>
                    <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
                  </TouchableOpacity>
                  <Text style={styles.legalSeparator}> · </Text>
                  <TouchableOpacity
                    onPress={() => handleOpenLegal(PRIVACY_URL)}
                  >
                    <Text style={styles.legalLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Referral discount card (Android only) */}
          {!IS_IOS && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>REFERRAL DISCOUNT</Text>
              {referralDiscount > 0 ? (
                <Text style={styles.referralDiscountActive}>
                  ₱{referralDiscount}/month off applied ✓
                </Text>
              ) : (
                <Text style={styles.discountNote}>
                  Refer a friend and get ₱20/month off while they stay
                  subscribed.
                </Text>
              )}
            </View>
          )}

          {/* Referral link (Android only) */}
          {!IS_IOS && (
            <TouchableOpacity
              style={styles.referralRow}
              onPress={() => router.push("/(tabs)/profile/referral" as never)}
            >
              <Text style={styles.referralEmoji}>🎁</Text>
              <View style={styles.referralText}>
                <Text style={styles.referralTitle}>
                  Refer friends, save ₱20/month
                </Text>
                <Text style={styles.referralSub}>
                  1 active referral = ₱20 off every billing cycle
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}

          {/* Manage / Cancel */}
          {isActive && (
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                !IS_IOS && cancelSub.isPending && styles.disabled,
              ]}
              onPress={handleCancel}
              disabled={!IS_IOS && cancelSub.isPending}
            >
              <Text style={styles.cancelBtnText}>
                {IS_IOS
                  ? "Manage Subscription"
                  : cancelSub.isPending
                    ? "Cancelling..."
                    : "Cancel Subscription"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Restore button also shown to active iOS users */}
          {IS_IOS && isActive && (
            <TouchableOpacity
              style={[styles.restoreBtn, restoring && styles.disabled]}
              onPress={handleIOSRestore}
              disabled={restoring}
            >
              <Text style={styles.restoreBtnText}>
                {restoring ? "Restoring..." : "Restore Purchases"}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.footnote}>
            {IS_IOS
              ? "Subscriptions are managed through your Apple ID. Cancel anytime via iPhone Settings."
              : "Payment processed by PayMongo. GCash, Maya, Visa/Mastercard accepted."}
          </Text>

          {/* Persistent legal links — accessible to active subscribers too */}
          {isActive && (
            <View style={styles.legalLinksRow}>
              <TouchableOpacity onPress={() => handleOpenLegal(TERMS_URL)}>
                <Text style={styles.legalLink}>Terms of Use</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}> · </Text>
              <TouchableOpacity onPress={() => handleOpenLegal(PRIVACY_URL)}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    color: colors.brand.primary,
    fontSize: typography.base,
    fontFamily: fonts.medium,
    width: 60,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.lg,
    fontFamily: fonts.bold,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  planCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardActive: { borderColor: colors.success },
  planLabel: { ...labelStyle, marginBottom: spacing.sm },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planTier: {
    color: colors.text.primary,
    fontSize: typography.xl,
    fontFamily: fonts.bold,
  },
  planSub: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: `${colors.success}22`,
    borderColor: colors.success,
  },
  badgeFree: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border,
  },
  badgeText: { fontSize: typography.xs, fontFamily: fonts.semibold },
  badgeTextActive: { color: colors.success },
  badgeTextFree: { color: colors.text.muted },
  offerCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    gap: spacing.xs,
  },
  offerLabel: { ...labelStyle, color: colors.brand.secondary },
  planToggle: {
    flexDirection: "row",
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    padding: 3,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: "center",
    borderRadius: 8,
    position: "relative",
  },
  toggleBtnActive: { backgroundColor: colors.brand.primary },
  toggleBtnText: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
  },
  toggleBtnTextActive: { color: colors.white },
  savingsBadge: {
    position: "absolute",
    top: -8,
    right: 4,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 9,
  } as never,
  offerPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: spacing.xs,
  },
  offerPrice: {
    color: colors.brand.gold,
    fontSize: 28,
    fontFamily: fonts.extrabold,
  },
  offerPriceSub: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    marginBottom: 4,
  },
  priceLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  priceLoadingText: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
  },
  priceUnavailable: {
    color: colors.warning,
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    paddingVertical: spacing.xs,
  },
  iapErrorHint: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  betaBanner: {
    backgroundColor: `${colors.brand.secondary}22`,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand.secondary,
  },
  betaBannerText: {
    color: colors.brand.secondary,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    textAlign: "center",
  },
  discountBreakdown: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 8,
    padding: spacing.sm,
    gap: 2,
    marginBottom: spacing.xs,
  },
  discountLine: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
  },
  offerFeature: {
    color: colors.text.primary,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
  },
  subscribeBtn: {
    backgroundColor: colors.brand.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  subscribeBtnText: {
    color: colors.bg.primary,
    fontSize: typography.base,
    fontFamily: fonts.bold,
  },
  restoreBtn: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  restoreBtnText: {
    color: colors.brand.primary,
    fontSize: typography.sm,
    fontFamily: fonts.medium,
  },
  disabled: { opacity: 0.5 },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { ...labelStyle, marginBottom: spacing.sm },
  referralDiscountActive: {
    color: colors.success,
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
  },
  discountNote: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
  },
  referralRow: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  referralEmoji: { fontSize: 20 },
  referralText: { flex: 1 },
  referralTitle: {
    color: colors.text.primary,
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
  },
  referralSub: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  chevron: { color: colors.text.muted, fontSize: 20 },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.error,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
  footnote: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  paymentFailedCard: {
    backgroundColor: colors.warning + "18",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.warning,
    padding: spacing.md,
  },
  paymentFailedTitle: {
    color: colors.warning,
    fontSize: typography.base,
    fontFamily: fonts.bold,
    marginBottom: spacing.xs,
  },
  paymentFailedBody: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  paymentFailedBtn: {
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  paymentFailedBtnText: {
    color: "#000",
    fontSize: typography.sm,
    fontFamily: fonts.bold,
  },
  legalBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  legalDisclosure: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    lineHeight: 16,
    textAlign: "center",
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: spacing.xs,
  },
  legalLink: {
    color: colors.brand.primary,
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    textDecorationLine: "underline",
  },
  legalSeparator: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontFamily: fonts.regular,
  },
});
