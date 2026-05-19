import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Voice, {
  type SpeechResultsEvent,
  type SpeechErrorEvent,
  type SpeechEndEvent,
} from '@react-native-voice/voice';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';

export default function VoiceLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { meal_slot, date } = useLocalSearchParams<{ meal_slot: MealSlot; date: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      setTranscript(e.value?.[0] ?? '');
    };
    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      setIsListening(false);
    };
    Voice.onSpeechEnd = (_e: SpeechEndEvent) => {
      setIsListening(false);
    };
    return () => {
      void Voice.destroy().then(() => Voice.removeAllListeners());
    };
  }, []);

  async function startListening() {
    try {
      setTranscript('');
      setIsListening(true);
      await Voice.start(profile?.language_pref === 'fil' ? 'fil-PH' : 'en-PH');
    } catch {
      setIsListening(false);
      Alert.alert(
        'Mic error',
        'Could not start voice recognition. Check microphone permissions.',
      );
    }
  }

  async function stopListening() {
    await Voice.stop();
    setIsListening(false);
  }

  async function parseWithMayari() {
    if (!transcript.trim() || !userId) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          user_id: userId,
          message: transcript,
          mode: 'food_parse',
          language: profile?.language_pref ?? 'en',
        },
      });
      if (error) throw new Error(error.message);
      router.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathname: '/(tabs)/nutrition/voice-confirm' as any,
        params: {
          meal_slot,
          date,
          transcript,
          parsed: JSON.stringify((data as { parsed_foods?: unknown[] }).parsed_foods ?? []),
        },
      });
    } catch (e: unknown) {
      Alert.alert(
        'Parse error',
        e instanceof Error ? e.message : 'Could not parse. Try again.',
      );
    } finally {
      setParsing(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Voice Log</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          {isListening ? '🎙️ Listening...' : 'Tap the mic and say what you ate'}
        </Text>
        <Text style={styles.example}>
          e.g. "I had 2 cups of sinangag at 2 fried eggs"
        </Text>

        <TouchableOpacity
          style={[styles.mic, isListening && styles.micActive]}
          onPress={isListening ? stopListening : startListening}
        >
          <Text style={styles.micEmoji}>{isListening ? '⏹' : '🎙️'}</Text>
        </TouchableOpacity>

        {transcript.length > 0 && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>Recognized — edit if needed:</Text>
            <TextInput
              style={styles.transcriptInput}
              value={transcript}
              onChangeText={setTranscript}
              multiline
              placeholderTextColor={colors.text.muted}
            />
          </View>
        )}

        {transcript.trim().length > 0 && !parsing && (
          <TouchableOpacity style={styles.parseBtn} onPress={parseWithMayari}>
            <Text style={styles.parseBtnText}>Parse with Mayari →</Text>
          </TouchableOpacity>
        )}

        {parsing && (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.md }} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    color: colors.brand.primary,
    fontSize: typography.base,
    width: 60,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.lg,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  hint: {
    color: colors.text.primary,
    fontSize: typography.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  example: {
    color: colors.text.muted,
    fontSize: typography.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mic: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    marginVertical: spacing.lg,
  },
  micActive: {
    borderColor: colors.error,
    backgroundColor: colors.bg.elevated,
  },
  micEmoji: {
    fontSize: 40,
  },
  transcriptCard: {
    width: '100%',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptLabel: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginBottom: spacing.sm,
  },
  transcriptInput: {
    color: colors.text.primary,
    fontSize: typography.base,
    lineHeight: 22,
    minHeight: 80,
  },
  parseBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  parseBtnText: {
    color: colors.white,
    fontSize: typography.base,
    fontWeight: '700',
  },
});
