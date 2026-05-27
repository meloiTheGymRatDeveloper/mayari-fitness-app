import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { supabase } from '../../../lib/supabase';
import { colors, typography, spacing } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import ProGate from '../../../components/ui/ProGate';

// expo-speech-recognition requires a native build — not available in Expo Go.
// requireOptionalNativeModule safely returns null when the native module is absent
// (unlike requireNativeModule, which throws through Metro's guardedLoadModule and
// calls reportFatalError — bypassing any try/catch in userland).
// We guard the require() call with this check so the JS module is never loaded
// unless the native side is actually present.
type SpeechMod = {
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync(): Promise<{ granted: boolean }>;
    start(opts: { lang: string; interimResults: boolean; continuous: boolean }): void;
    stop(): void;
    addListener(
      event: string,
      handler: (e: { results?: Array<{ transcript: string }>; isFinal?: boolean }) => void
    ): { remove(): void };
  };
};

let cachedSpeechMod: SpeechMod | null = null;
let speechModChecked = false;

function getSpeechMod(): SpeechMod | null {
  if (!speechModChecked) {
    speechModChecked = true;
    // requireOptionalNativeModule returns null (never throws) when the native module
    // is not registered — safe to call in Expo Go.
    const nativeExists = requireOptionalNativeModule('ExpoSpeechRecognition') != null;
    if (!nativeExists) {
      cachedSpeechMod = null;
      return null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cachedSpeechMod = require('expo-speech-recognition') as SpeechMod;
    } catch {
      cachedSpeechMod = null;
    }
  }
  return cachedSpeechMod;
}

type ScreenState = 'idle' | 'recording' | 'processing' | 'fallback';

interface ParsedFood {
  name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export default function VoiceScreen() {
  const { canUse } = useFeatureAccess();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { meal_slot, date } = useLocalSearchParams<{ meal_slot: MealSlot; date: string }>();
  const [state, setState] = useState<ScreenState>(() =>
    getSpeechMod() ? 'idle' : 'fallback'
  );
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');

  const stopAndParse = useCallback(async (text: string) => {
    setState('processing');
    try {
      const { data, error } = await supabase.functions.invoke('voice-log', {
        body: { transcript: text, meal_slot },
      });
      if (error) throw error;
      const result = data as { items: ParsedFood[] };
      if (!result.items?.length) {
        Alert.alert(
          'Hindi ko naintindihan',
          'Subukan ulit o i-type ang iyong kinain.',
          [
            { text: 'Try Again', onPress: () => setState('idle') },
            { text: 'Type Instead', onPress: () => setState('fallback') },
          ],
        );
        return;
      }
      router.replace({
        pathname: '/(tabs)/nutrition/voice-confirm' as never,
        params: { meal_slot, date, parsed: JSON.stringify(result.items) },
      });
    } catch {
      Alert.alert(
        'Error',
        'Could not process. Try typing instead.',
        [
          { text: 'Type Instead', onPress: () => setState('fallback') },
          { text: 'Try Again', onPress: () => setState('idle') },
        ],
      );
    }
  }, [meal_slot, date, router]);

  // Register speech event listeners using addListener (avoids useSpeechRecognitionEvent hook,
  // which would crash at module load time in Expo Go)
  useEffect(() => {
    const mod = getSpeechMod();
    if (!mod) return;

    const sm = mod.ExpoSpeechRecognitionModule;

    const resultSub = sm.addListener('result', (event) => {
      const firstResult = event.results?.[0];
      if (firstResult) setTranscript(firstResult.transcript);
      if (event.isFinal && firstResult?.transcript) {
        stopAndParse(firstResult.transcript);
      }
    });

    const errorSub = sm.addListener('error', () => {
      setState('fallback');
    });

    return () => {
      resultSub.remove();
      errorSub.remove();
    };
  }, [stopAndParse]);

  if (!canUse('voiceLog')) {
    return (
      <ProGate
        title="Voice Food Logging"
        description='Say "I had sinangag, two eggs, and a cup of rice" — Mayari understands Tagalog, English, and Taglish.'
      />
    );
  }

  async function startRecording() {
    const mod = getSpeechMod();
    if (!mod) { setState('fallback'); return; }
    const { granted } = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) { setState('fallback'); return; }
    setState('recording');
    setTranscript('');
    mod.ExpoSpeechRecognitionModule.start({
      lang: 'fil-PH',
      interimResults: true,
      continuous: false,
    });
  }

  function stopRecording() {
    getSpeechMod()?.ExpoSpeechRecognitionModule.stop();
    if (transcript) stopAndParse(transcript);
    else setState('idle');
  }

  if (state === 'fallback') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Type what you ate</Text>
        <Text style={styles.sub}>e.g. "1 cup sinangag, 2 pritong itlog, kape"</Text>
        <TextInput
          style={styles.textInput}
          value={manualText}
          onChangeText={setManualText}
          placeholder="Isulat ang iyong kinain..."
          placeholderTextColor={colors.text.muted}
          multiline
          autoFocus
        />
        <TouchableOpacity
          style={[styles.parseBtn, !manualText.trim() && styles.parseBtnOff]}
          onPress={() => manualText.trim() && stopAndParse(manualText)}
          disabled={!manualText.trim()}
        >
          <Text style={styles.parseBtnText}>Parse Food</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'processing') {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.processingText}>Sinusuri...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backAbs}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {state === 'recording' && transcript ? (
        <Text style={styles.transcript}>{transcript}</Text>
      ) : (
        <Text style={styles.prompt}>
          {state === 'recording' ? 'Magsalita ka...' : 'I-tap para mag-record'}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.micBtn, state === 'recording' && styles.micBtnActive]}
        onPress={state === 'recording' ? stopRecording : startRecording}
      >
        <Text style={styles.micIcon}>{state === 'recording' ? '⏹' : '🎤'}</Text>
      </TouchableOpacity>

      <Text style={styles.micHint}>
        {state === 'recording' ? 'Tap to stop' : 'Tap mic to start'}
      </Text>

      <TouchableOpacity onPress={() => setState('fallback')} style={styles.typeLink}>
        <Text style={styles.typeLinkText}>Type instead</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary, padding: spacing.lg },
  center: { justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: spacing.lg },
  backAbs: { position: 'absolute', top: 60, left: spacing.lg },
  backText: { color: colors.brand.primary, fontSize: typography.base },
  heading: {
    color: colors.text.primary,
    fontSize: typography.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sub: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.lg },
  prompt: {
    color: colors.text.secondary,
    fontSize: typography.lg,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  transcript: {
    color: colors.text.primary,
    fontSize: typography.base,
    marginBottom: spacing.xl,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  micBtnActive: { backgroundColor: colors.error },
  micIcon: { fontSize: 40 },
  micHint: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.xl },
  typeLink: { marginTop: spacing.lg },
  typeLinkText: { color: colors.brand.primary, fontSize: typography.sm },
  textInput: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
    fontSize: typography.base,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  parseBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  parseBtnOff: { opacity: 0.4 },
  parseBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  processingText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
    fontSize: typography.base,
  },
});
