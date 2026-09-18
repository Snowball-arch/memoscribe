# memoscribe 🎙️📝

Transcribe voice memos **entirely on your own machine**. memoscribe uses
[Tether's QVAC SDK](https://github.com/tetherto/qvac) to run NVIDIA's Parakeet
speech-recognition model locally — no API key, no usage bill, and your audio
never leaves your device.

## What it does

- Takes one or more voice memos (16 kHz mono WAV) and writes a `.txt`
  transcript for each, into `./transcripts/` by default.
- Can batch-transcribe a whole folder of memos with `--dir`.
- The first run downloads the Parakeet model (~750 MB); it is cached on disk
  afterwards and loads instantly.

**QVAC SDK version used:** `0.19.0`
**QVAC functions called:** `loadModel` + `transcribe` (+ `unloadModel`)

## Why on-device?

Voice memos often contain personal or sensitive conversations. Sending them to
a cloud transcription API means trusting someone else's server (and paying per
minute). With QVAC, the model runs on your laptop: private, offline-capable
after the first download, and free forever.

## Install

Requires Node.js 20+.

```bash
git clone https://github.com/<Snowball-arch>/memoscribe.git
cd memoscribe
npm install
```

`npm install` pulls in `@qvac/sdk` and its worker. The Parakeet model itself
is downloaded automatically the first time you transcribe.

## Run

Transcribe a single memo:

```bash
node transcribe.js memos/idea-for-a-novel.wav
```

Transcribe every memo in a folder:

```bash
node transcribe.js --dir ./memos
```

Choose a different output folder or a custom Parakeet GGUF:

```bash
node transcribe.js memo.wav --out ./notes
node transcribe.js memo.wav --model /path/to/parakeet-tdt.gguf
```

### Make a test memo

Any 16 kHz mono WAV works. On macOS you can synthesize one:

```bash
say -o memo.aiff "This is a voice memo, transcribed on my laptop, and sent to no one."
afconvert -f WAVE -d LEI16 -c 1 -b 16 --mix memo.aiff memos/memo.wav   # to 16-bit mono WAV
node transcribe.js memos/memo.wav
```

Or download QVAC's sample audio:
[sample-16khz.wav](https://github.com/tetherto/qvac/blob/main/packages/sdk/examples/audio/sample-16khz.wav)

### Expected output

```
▸ Loading transcription model (first run downloads ~750 MB, then it's cached)...
▸ Downloading model 100% (748.5/748.5 MB)
▸ Model loaded: parakeet-transcription:…
▸ Transcribing 1 memo — audio stays on this device.

  ✔ memo.wav
    → /…/transcripts/memo.txt  (14 words)
    “This is a voice memo, transcribed on my laptop, and sent to no one.”

▸ Done — 1/1 memos transcribed. Nothing ever left this machine.
```

## How it works

1. `loadModel({ modelSrc: PARAKEET_TDT_0_6B_V3_Q8_0, modelType: 'parakeet-transcription' })`
   downloads (once) and loads the Parakeet TDT GGUF into memory.
2. `transcribe({ modelId, audioChunk: 'memo.wav' })` runs inference locally and
   returns the transcript string.
3. `unloadModel({ modelId })` frees the memory when finished.

See [`transcribe.js`](./transcribe.js) — it is short and commented.

## Privacy

- No network calls happen at inference time. The only network activity is the
  **one-time** model download from the QVAC model registry.
- No telemetry, no analytics, no accounts.

## License

MIT — see [LICENSE](./LICENSE).
