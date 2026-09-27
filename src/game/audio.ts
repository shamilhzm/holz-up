import { useStore } from '../state/store'

/** Small synthesized workshop sounds: no audio files, starts only after a user gesture. */
let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null
let saw: { gain: GainNode; filter: BiquadFilterNode } | null = null

function audio(): AudioContext | null {
  if (useStore.getState().muted) return null
  try {
    if (!ctx) {
      ctx = new AudioContext()
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const d = noise.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function noiseSource(a: AudioContext) {
  const src = a.createBufferSource()
  src.buffer = noise
  src.loop = true
  return src
}

/** Rasp of a pull saw; call with the stroke speed (px per frame), 0 when idle. */
export function sawSound(speed: number) {
  const a = audio()
  if (!a) return
  if (!saw) {
    const src = noiseSource(a)
    const filter = a.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.2
    const gain = a.createGain()
    gain.gain.value = 0
    src.connect(filter).connect(gain).connect(a.destination)
    src.start()
    saw = { gain, filter }
  }
  const v = Math.min(1, speed / 40)
  saw.gain.gain.setTargetAtTime(v * 0.22, a.currentTime, 0.03)
  saw.filter.frequency.setTargetAtTime(1800 + v * 2600, a.currentTime, 0.05)
}

/** Short woody knock: a part seated, an offcut dropping. */
export function knock(pitch = 220, level = 0.5) {
  const a = audio()
  if (!a) return
  const src = noiseSource(a)
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = pitch * 4
  filter.Q.value = 6
  const gain = a.createGain()
  const t = a.currentTime
  gain.gain.setValueAtTime(level, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  src.connect(filter).connect(gain).connect(a.destination)
  src.start(t)
  src.stop(t + 0.2)
}
