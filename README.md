# memoscribe

Private voice-memo transcription using Tether QVAC and NVIDIA Parakeet.

memoscribe runs speech-to-text inference locally on the device. Audio is processed with QVAC's Parakeet transcription model without sending the recording to a cloud AI service.

## What it does

- Transcribes a 16 kHz mono WAV voice memo
- Uses Tether QVAC SDK for on-device inference
- Uses NVIDIA Parakeet TDT 0.6B
- Displays the transcript directly in the Android app
- No cloud AI API key required

## QVAC integration

The mobile app uses:

- `@qvac/sdk` **0.19.1**
- `loadModel()`
- `transcribe()`
- `unloadModel()`

The Parakeet model is:

`PARAKEET_TDT_0_6B_V3_Q8_0`

The Android build uses the QVAC Expo plugin and the Parakeet transcription plugin.

## Android app

The working Android application is in:

`mobile/`

Main files:

- `mobile/App.tsx` — React Native app and QVAC inference
- `mobile/app.json` — Expo/QVAC Android configuration
- `mobile/qvac.config.json` — Parakeet QVAC plugin
- `mobile/package.json` — dependencies
- `mobile/test.wav` — sample 16 kHz mono test recording

### Requirements

- Node.js 20+
- Android device running Android 12+
- Android SDK
- USB debugging enabled
- QVAC-compatible Android device

### Install

```bash
cd mobile
npm install
npx expo prebuild --platform android