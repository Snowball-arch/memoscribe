#!/usr/bin/env node
/**
 * memoscribe — offline voice-memo transcription.
 *
 * Turns voice memos (16 kHz mono WAV files) into text using NVIDIA Parakeet
 * running fully on-device via the QVAC SDK. No API key, no cloud, no upload:
 * the audio never leaves the machine.
 *
 * Usage:
 *   node transcribe.js memo.wav [more-memos.wav ...]
 *   node transcribe.js --dir ./memos
 *   node transcribe.js memo.wav --out ./my-transcripts
 *   node transcribe.js memo.wav --model /path/to/custom-parakeet.gguf
 *
 * The first run downloads the Parakeet model (~750 MB); after that it is
 * cached on disk and loads instantly.
 */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { platform } from 'node:os'
import {
  loadModel,
  transcribe,
  unloadModel,
  PARAKEET_TDT_0_6B_V3_Q8_0
} from '@qvac/sdk'

const HELP = `memoscribe — transcribe voice memos on-device (QVAC SDK)

Usage:
  node transcribe.js <memo.wav> [more.wav ...]   Transcribe one or more WAV files
  node transcribe.js --dir <folder>              Transcribe every WAV in a folder
  node transcribe.js --help                      Show this help

Options:
  --out <folder>      Where to save .txt transcripts   (default: ./transcripts)
  --model <path>      Use a custom Parakeet GGUF instead of the registry model
  --help              Show this help

Audio should be 16 kHz mono PCM in a WAV container for best results.
Nothing is uploaded anywhere — the model runs locally.`

function parseArgs (argv) {
  const files = []
  let dir = null
  let out = './transcripts'
  let model = PARAKEET_TDT_0_6B_V3_Q8_0
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') return { help: true }
    if (arg === '--dir') dir = argv[++i]
    else if (arg === '--out') out = argv[++i]
    else if (arg === '--model') model = argv[++i]
    else files.push(arg)
  }
  return { files, dir, out, model }
}

function collectWavs (dir) {
  return readdirSync(dir)
    .filter((f) => extname(f).toLowerCase() === '.wav')
    .sort()
    .map((f) => join(dir, f))
}

function printProgress (p) {
  const mb = (n) => (n / 1e6).toFixed(1)
  const line = `▸ Downloading model ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`
  process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`)
  if (p.percentage >= 100) process.stderr.write('\n')
}

function assertValidWav (file) {
  if (!existsSync(file)) throw new Error(`File not found: ${file}`)
  if (extname(file).toLowerCase() !== '.wav') {
    throw new Error(`${file} is not a .wav file — convert it to 16 kHz mono WAV first.`)
  }
  if (statSync(file).size === 0) throw new Error(`${file} is empty.`)
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || (!args.files.length && !args.dir)) {
    console.log(HELP)
    process.exit(args.help ? 0 : 1)
  }

  const files = [...args.files]
  if (args.dir) files.push(...collectWavs(resolve(args.dir)))
  if (!files.length) {
    console.error(`✖ No .wav files found${args.dir ? ` in ${args.dir}` : ''}.`)
    process.exit(1)
  }
  files.forEach(assertValidWav)

  const outDir = resolve(args.out)
  mkdirSync(outDir, { recursive: true })

  console.log(`▸ Loading transcription model (first run downloads ~750 MB, then it's cached)...`)
  const modelId = await loadModel({
    modelSrc: args.model,
    modelType: 'parakeet-transcription',
    onProgress: printProgress
  })
  console.log(`▸ Model loaded: ${modelId}`)
  console.log(`▸ Transcribing ${files.length} memo${files.length > 1 ? 's' : ''} — audio stays on this device.\n`)

  let done = 0
  for (const file of files) {
    const name = basename(file, extname(file))
    const text = (await transcribe({ modelId, audioChunk: resolve(file) })).trim()

    const outPath = join(outDir, `${name}.txt`)
    const stamp = new Date().toISOString()
    writeFileSync(outPath, `Transcript of ${basename(file)}\nTranscribed locally with QVAC Parakeet on ${stamp}\n${'-'.repeat(60)}\n\n${text}\n`)

    const words = text.split(/\s+/).filter(Boolean).length
    console.log(`  ✔ ${basename(file)}`)
    console.log(`    → ${outPath}  (${words} words)`)
    if (text) console.log(`    “${text.length > 90 ? text.slice(0, 90) + '…' : text}”`)
    done++
  }

  await unloadModel({ modelId })
  console.log(`\n▸ Done — ${done}/${files.length} memos transcribed. Nothing ever left this machine.`)
}

main().catch((error) => {
  console.error('✖', error.message || error)
  if (platform() === 'darwin') {
    console.error('  Tip: create a test memo with  say -o memo.aiff "hello world"  then convert:')
    console.error('    afconvert -f m4af -d aac -b 96000 memo.aiff memo.m4a   (or use any 16 kHz mono wav)')
  }
  process.exit(1)
})
