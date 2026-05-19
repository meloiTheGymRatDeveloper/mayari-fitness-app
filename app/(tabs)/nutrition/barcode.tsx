import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { getFoodByBarcode } from '../../../lib/foodSearch';
import { colors, typography, spacing } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';

export default function BarcodeScannerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { meal_slot, date } = useLocalSearchParams<{ meal_slot: MealSlot; date: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  async function handleBarcode({ data: barcode }: { data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const food = await getFoodByBarcode(barcode);
      if (food) {
        router.replace({
          pathname: '/(tabs)/nutrition/food/[id]',
          params: { id: food.id, meal_slot, date },
        });
      } else {
        Alert.alert(
          'Not Found',
          `Barcode ${barcode} is not in our database.`,
          [
            { text: 'Search Manually', onPress: () => router.replace({ pathname: '/(tabs)/nutrition/search', params: { meal_slot, date } }) },
            { text: 'Try Again', onPress: () => setScanned(false) },
          ],
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (hasPermission === null) {
    return <View style={styles.centered}><ActivityIndicator color={colors.brand.primary} /></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Camera permission is required to scan barcodes.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
      />

      <View style={styles.overlay}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕ Cancel</Text>
        </TouchableOpacity>

        <View style={styles.guideBox} />

        <Text style={styles.hint}>
          {loading ? 'Looking up barcode...' : 'Point camera at a barcode'}
        </Text>

        {loading && <ActivityIndicator color="#fff" style={{ marginTop: spacing.md }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  permText: { color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.lg },
  backBtn: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  backBtnText: { color: '#fff', fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 56, left: spacing.lg, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  closeBtnText: { color: '#fff', fontWeight: '600' },
  guideBox: { width: 260, height: 160, borderWidth: 2, borderColor: '#fff', borderRadius: 12, backgroundColor: 'transparent' },
  hint: { color: '#fff', marginTop: spacing.lg, fontSize: typography.sm, textAlign: 'center' },
});
