import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PhotoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { meal_slot, date } = useLocalSearchParams<{ meal_slot?: MealSlot; date?: string }>();
  const userId = useAuthStore(s => s.session?.user.id);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const effectiveDate = date ?? todayStr();

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
      } else {
        Alert.alert('', 'Could not capture photo. Try again.');
      }
    } catch {
      Alert.alert('', 'Camera error. Try again.');
    }
  };

  const handleAnalyze = async () => {
    if (!photoUri || !userId) return;
    setAnalyzing(true);
    try {
      const filename = `${userId}/${Date.now()}.jpg`;
      const fetchRes = await fetch(photoUri);
      const arrayBuffer = await fetchRes.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('food-photos')
        .upload(filename, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from('food-photos')
        .createSignedUrl(filename, 300);
      if (signError || !signedData?.signedUrl) throw new Error('Could not get signed URL');

      const { data, error } = await supabase.functions.invoke('verify-photo', {
        body: { photoUrl: signedData.signedUrl },
      });
      if (error) throw error;

      if ((data as { error?: string }).error === 'not_food') {
        Alert.alert('', "Doesn't look like food. Try a clearer photo.");
        setPhotoUri(null);
        return;
      }

      router.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathname: '/(tabs)/nutrition/scan-confirm' as any,
        params: {
          meal_slot: meal_slot ?? 'almusal',
          date: effectiveDate,
          result: JSON.stringify(data),
        },
      });
    } catch (e: unknown) {
      Alert.alert('Analysis failed', e instanceof Error ? e.message : 'Please try again');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator color={colors.brand.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Camera permission is required to log food by photo.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photoUri) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        {analyzing ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.overlayText}>Analyzing...</Text>
          </View>
        ) : (
          <View style={styles.previewBtns}>
            <TouchableOpacity style={styles.btn} onPress={handleAnalyze}>
              <Text style={styles.btnText}>Analyze Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setPhotoUri(null)}>
              <Text style={styles.retryText}>Retake</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraUI}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Point at your food</Text>
          <TouchableOpacity style={styles.shutter} onPress={handleCapture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  camera: { flex: 1 },
  cameraUI: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  closeBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: {
    color: '#fff',
    fontSize: typography.sm,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shutter: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  preview: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  overlayText: { color: '#fff', fontSize: typography.base },
  previewBtns: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  btn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  btnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  retryBtn: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { color: colors.text.secondary, fontSize: typography.base, fontWeight: '600' },
  permText: {
    color: colors.text.secondary,
    fontSize: typography.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  backLink: { marginTop: spacing.md },
  backLinkText: { color: colors.text.muted, fontSize: typography.sm },
});
