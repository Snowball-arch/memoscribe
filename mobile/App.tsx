import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  loadModel,
  transcribe,
  unloadModel,
  PARAKEET_TDT_0_6B_V3_Q8_0,
} from '@qvac/sdk';

export default function App() {
  const [status, setStatus] = useState('Ready');
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);

  async function transcribeMemo() {
    if (busy) return;

    setBusy(true);
    setTranscript('');
    setProgress(0);

    let modelId: string | undefined;

    try {
      setStatus('Preparing audio...');

      const audioAsset = Asset.fromModule(require('./assets/test.wav'));
      await audioAsset.downloadAsync();

      if (!audioAsset.localUri) {
        throw new Error('Could not access the test audio file.');
      }

      const audioPath = audioAsset.localUri.replace(/^file:\/\//, '');

      setStatus('Loading Parakeet on-device...');

      modelId = await loadModel({
        modelSrc: PARAKEET_TDT_0_6B_V3_Q8_0,
        modelType: 'parakeet-transcription',
        onProgress: (p) => {
          setProgress(Math.round(p.percentage));
          setStatus(`Downloading model: ${Math.round(p.percentage)}%`);
        },
      });

      setStatus('Transcribing on-device...');

      const text = await transcribe({
        modelId,
        audioChunk: audioPath,
      });

      setTranscript(text.trim() || '(No speech detected)');
      setStatus('Transcription complete');
    } catch (error) {
      console.error('QVAC transcription error:', error);
      setStatus('Transcription failed');
      setTranscript(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      if (modelId) {
        try {
          await unloadModel({ modelId });
        } catch (error) {
          console.error('QVAC unload error:', error);
        }
      }

      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>memoscribe</Text>

        <Text style={styles.subtitle}>
          Private voice-memo transcription
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>ENGINE</Text>
          <Text style={styles.value}>Tether QVAC + NVIDIA Parakeet</Text>

          <Text style={styles.label}>PROCESSING</Text>
          <Text style={styles.value}>On-device</Text>

          <Text style={styles.label}>AUDIO</Text>
          <Text style={styles.value}>test.wav · 16 kHz mono WAV</Text>
        </View>

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={transcribeMemo}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.buttonText}>Transcribe memo</Text>
          )}
        </Pressable>

        <Text style={styles.status}>{status}</Text>

        {busy && progress > 0 && (
          <Text style={styles.progress}>{progress}%</Text>
        )}

        <View style={styles.transcriptCard}>
          <Text style={styles.label}>TRANSCRIPT</Text>
          <Text style={styles.transcript}>
            {transcript || 'Your transcription will appear here.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#101114',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 56,
  },
  title: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: '#a9adb7',
    fontSize: 16,
    marginTop: 6,
    marginBottom: 28,
  },
  card: {
    backgroundColor: '#1b1d22',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    color: '#7f8795',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 4,
  },
  value: {
    color: '#f4f5f7',
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#101114',
    fontSize: 17,
    fontWeight: '700',
  },
  status: {
    color: '#a9adb7',
    textAlign: 'center',
    fontSize: 14,
    minHeight: 22,
  },
  progress: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
  },
  transcriptCard: {
    backgroundColor: '#1b1d22',
    borderRadius: 18,
    padding: 20,
    marginTop: 24,
    minHeight: 180,
  },
  transcript: {
    color: '#f4f5f7',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 10,
  },
});
