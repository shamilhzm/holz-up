import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cutError, KERF, type CutJob } from '../game/build'
import { useLive } from '../game/live'
import { knock, sawSound } from '../game/audio'
import { useStore } from '../state/store'
import { hashString, makeWoodMaterial } from './woodMaterial'

const MM = 0.001
/** Board top height (m), pencil line position along z (m), offcut length (mm). */
export const CUT = { top: 0.64, lineZ: 0.1, offcut: 140 }

const steel = new THREE.MeshStandardMaterial({ color: '#dfe2e6', metalness: 0.55, roughness: 0.32 })
const rattan = new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.8 })
const pencil = new THREE.MeshBasicMaterial({ color: '#3a3430' })
const kerfMat = new THREE.MeshBasicMaterial({ color: '#2a1e14' })
const bladeMark = new THREE.MeshBasicMaterial({ color: '#c23b22', transparent: true, opacity: 0.8 })
const dustMat = new THREE.PointsMaterial({ color: '#e9cf9e', size: 0.004, sizeAttenuation: true })

/** Folding-rule strip with mm ticks, centred on the pencil line. */
function useRulerTexture(lengthMm: number) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 2048
    c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = '#f2d34f'
    g.fillRect(0, 0, c.width, c.height)
    g.fillStyle = '#1d1a16'
    const px = c.width / lengthMm
    for (let mm = 0; mm <= lengthMm; mm++) {
      const x = mm * px
      const h = mm % 10 === 0 ? 30 : mm % 5 === 0 ? 20 : 11
      g.fillRect(x - 1, 0, 2, h)
      if (mm % 10 === 0) {
        g.font = 'bold 20px sans-serif'
        g.fillText(String(Math.abs(mm - lengthMm / 2) / 10), x + 3, 56)
      }
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
  }, [lengthMm])
}

/** Workbench (Hobelbank): the board lies on it, the offcut hangs past the front edge. */
function Bench({ frontZ, height, top, legs }: { frontZ: number; height: number; top: THREE.Material; legs: THREE.Material }) {
  const depth = 1.6
  const z = frontZ - depth / 2
  return (
    <group>
      <mesh material={top} position={[0, height - 0.035, z]} castShadow receiveShadow>
        <boxGeometry args={[0.75, 0.07, depth]} />
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} material={legs} position={[sx * 0.3, (height - 0.07) / 2, z + sz * (depth / 2 - 0.12)]} castShadow>
          <boxGeometry args={[0.07, height - 0.07, 0.07]} />
        </mesh>
      )))}
      <mesh material={legs} position={[0, 0.12, z]}>
        <boxGeometry args={[0.07, 0.07, depth - 0.24]} />
      </mesh>
    </group>
  )
}

interface Dust { p: Float32Array; v: Float32Array; life: Float32Array; next: number }

export function CutStation({ job }: { job: CutJob }) {
  const { camera, gl, invalidate } = useThree()
  const recordCut = useStore((s) => s.recordCut)
  // Re-render as the blade moves and the kerf deepens.
  useLive((s) => s.bladeOffset)
  useLive((s) => s.progress)
  const L = job.l
  const w = Math.min(job.method === 'holesaw' ? 120 : job.w, 900)
  const t = job.t
  const hole = job.method === 'holesaw'
  const lineZ = CUT.lineZ
  const top = CUT.top

  const state = useRef({ offset: 3, progress: 0, phase: 'align' as 'align' | 'sawing' | 'falling', down: false, lastX: 0, lastY: 0, stroke: 0, fall: 0 })
  const [, force] = useState(0)
  const rerender = () => force((n) => n + 1)
  const [offcuts, setOffcuts] = useState<{ key: string; x: number; z: number; rot: number; len: number }[]>([])

  // Fresh board for each job.
  useEffect(() => {
    state.current = { offset: 3, progress: 0, phase: 'align', down: false, lastX: 0, lastY: 0, stroke: 0, fall: 0 }
    useLive.getState().set({ bladeOffset: 3, progress: 0, phase: 'align' })
    invalidate()
    rerender()
  }, [job.key, invalidate])

  const wood = useMemo(() => makeWoodMaterial({ species: job.species, grain: 'z', size: [w, t, L + CUT.offcut], seed: hashString(job.key), oiled: false }), [job, w, t, L])
  const benchTop = useMemo(() => makeWoodMaterial({ species: 'beech', grain: 'z', size: [750, 70, 1600], seed: 5, oiled: true }), [])
  const benchLegs = useMemo(() => makeWoodMaterial({ species: 'beech', grain: 'y', size: [70, 600, 70], seed: 9, oiled: true }), [])
  const ruler = useRulerTexture(200)

  // Board pieces share one object space so the grain runs on across the cut.
  const pieces = useMemo(() => {
    const s = state.current
    const cutAt = hole ? 0 : s.offset
    const piece = (z0: number, z1: number) => {
      const g = new THREE.BoxGeometry(w * MM, t * MM, (z1 - z0) * MM)
      g.translate(0, 0, ((z0 + z1) / 2) * MM)
      return g
    }
    return {
      whole: piece(-L, CUT.offcut),
      part: piece(-L, cutAt - KERF / 2),
      off: piece(cutAt + KERF / 2, CUT.offcut),
    }
    // Recomputed when the cut finishes (phase change re-renders).
  }, [w, t, L, hole, job.key, state.current.phase === 'falling'])

  const dust = useRef<Dust>({ p: new Float32Array(600), v: new Float32Array(600), life: new Float32Array(200), next: 0 })
  const dustGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(dust.current.p, 3))
    return g
  }, [])
  const emit = (x: number, z: number, n: number) => {
    const d = dust.current
    for (let i = 0; i < n; i++) {
      const k = d.next++ % 200
      d.p.set([x, top, z], k * 3)
      d.v.set([(Math.random() - 0.5) * 0.25, Math.random() * 0.25, (Math.random() - 0.3) * 0.25], k * 3)
      d.life[k] = 0.9
    }
  }

  // Pointer: move to align, hold + stroke sideways to saw.
  useEffect(() => {
    const el = gl.domElement
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -top)
    const ray = new THREE.Raycaster()
    const hit = new THREE.Vector3()
    const toZ = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
      return ray.ray.intersectPlane(plane, hit) ? hit.z : null
    }
    const publish = () => {
      const s = state.current
      useLive.getState().set({ bladeOffset: s.offset, progress: s.progress, phase: s.phase })
      invalidate()
    }
    const onMove = (e: PointerEvent) => {
      const s = state.current
      if (s.phase === 'align' && !hole) {
        const z = toZ(e)
        if (z !== null) s.offset = Math.max(-12, Math.min(12, (z - lineZ) / MM))
      } else if (s.phase === 'sawing' && s.down && !hole) {
        const dx = e.clientX - s.lastX
        const dy = e.clientY - s.lastY
        const need = 900 + w * 2.2
        s.progress = Math.min(1, s.progress + Math.abs(dx) / need)
        // Wandering strokes steer the blade; once the kerf is deep it guides the saw.
        const gain = 0.035 * (s.progress < 0.25 ? 1 : 0.25)
        s.offset += dy * gain
        s.stroke = Math.max(-60, Math.min(60, s.stroke + dx * 0.3))
        sawSound(Math.abs(dx))
        emit(-w / 2 * MM + s.progress * w * MM, lineZ + s.offset * MM, 2)
        if (s.progress >= 1) finish()
      }
      s.lastX = e.clientX
      s.lastY = e.clientY
      publish()
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const s = state.current
      if (s.phase === 'falling') return
      if (s.phase === 'align') s.phase = 'sawing'
      s.down = true
      s.lastX = e.clientX
      s.lastY = e.clientY
      el.setPointerCapture(e.pointerId)
      publish()
      rerender()
    }
    const onUp = () => {
      state.current.down = false
      sawSound(0)
    }
    const onKey = (e: KeyboardEvent) => {
      const s = state.current
      if (s.phase !== 'align' || hole) return
      if (e.key === 'ArrowUp') s.offset -= 0.1
      else if (e.key === 'ArrowDown') s.offset += 0.1
      else return
      e.preventDefault()
      publish()
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey)
      sawSound(0)
    }
  }, [gl, camera, job.key, w, hole, invalidate])

  function finish() {
    const s = state.current
    s.phase = 'falling'
    s.down = false
    s.fall = 0
    sawSound(0)
    knock(140, 0.7)
    rerender()
  }

  useFrame((_, dt) => {
    const s = state.current
    let busy = false
    if (hole && s.phase === 'sawing' && s.down) {
      s.progress = Math.min(1, s.progress + dt / 1.6)
      sawSound(25)
      emit(0, lineZ, 1)
      useLive.getState().set({ progress: s.progress })
      if (s.progress >= 1) finish()
      busy = true
    }
    if (s.phase === 'falling') {
      s.fall += dt
      busy = true
      if (s.fall > 1.1) {
        const err = hole ? 0 : cutError(s.offset)
        s.phase = 'align'
        if (!hole) setOffcuts((o) => [...o.slice(-5), { key: `${job.key}${o.length}`, x: (Math.random() - 0.5) * 0.3, z: lineZ + 0.22 + Math.random() * 0.1, rot: Math.random() * 3, len: CUT.offcut }])
        useLive.getState().set({ lastCut: { key: job.key, err } })
        recordCut(job.key, err)
      }
    }
    const d = dust.current
    let alive = false
    for (let k = 0; k < 200; k++) {
      if (d.life[k] <= 0) continue
      alive = true
      d.life[k] -= dt
      d.v[k * 3 + 1] -= 1.6 * dt
      for (let a = 0; a < 3; a++) d.p[k * 3 + a] += d.v[k * 3 + a] * dt
      if (d.p[k * 3 + 1] < 0.005) { d.p[k * 3 + 1] = 0.005; d.v.fill(0, k * 3, k * 3 + 3) }
      if (d.life[k] <= 0) d.p[k * 3 + 1] = -1
    }
    dustGeo.attributes.position.needsUpdate = true
    if (busy || alive) invalidate()
  })

  const s = state.current
  const falling = s.phase === 'falling'
  const fallT = Math.min(1, s.fall / 0.6)
  const kerfZ = lineZ + s.offset * MM
  const kerfLen = s.progress * w * MM
  const boardY = top - (t * MM) / 2
  const sawX = -w / 2 * MM + kerfLen + s.stroke * MM

  return (
    <group>
      <Bench frontZ={lineZ - 0.03} height={top - t * MM} top={benchTop} legs={benchLegs} />
      {!falling ? (
        <mesh geometry={pieces.whole} material={wood} position={[0, boardY, lineZ]} castShadow receiveShadow />
      ) : (
        <>
          <mesh geometry={pieces.part} material={wood} position={[0, boardY + fallT * 0.03, lineZ]} castShadow receiveShadow />
          <mesh geometry={pieces.off} material={wood} position={[0, boardY - fallT * fallT * (top - 0.02), lineZ + fallT * 0.06]} rotation={[fallT * 1.2, 0, fallT * 0.4]} castShadow />
        </>
      )}
      {offcuts.map((o) => (
        <mesh key={o.key} material={wood} position={[o.x, (t * MM) / 2, o.z]} rotation={[0, o.rot, 0]} castShadow>
          <boxGeometry args={[w * MM * 0.6, t * MM, o.len * MM]} />
        </mesh>
      ))}
      {!falling && (
        <>
          {hole ? (
            <mesh position={[0, top + 0.0006, lineZ]} rotation={[-Math.PI / 2, 0, 0]} material={pencil}>
              <ringGeometry args={[0.03 - 0.0004, 0.03, 48]} />
            </mesh>
          ) : (
            <mesh material={pencil} position={[0, top + 0.0004, lineZ]}>
              <boxGeometry args={[w * MM, 0.0003, 0.0006]} />
            </mesh>
          )}
          {!hole && (
            <mesh position={[-w / 2 * MM + 0.012, top + 0.0012, lineZ]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
              <planeGeometry args={[0.2, 0.02]} />
              <meshStandardMaterial map={ruler} roughness={0.6} />
            </mesh>
          )}
          {!hole && s.progress > 0 && (
            <mesh material={kerfMat} position={[-w / 2 * MM + kerfLen / 2, boardY, kerfZ]}>
              <boxGeometry args={[kerfLen, t * MM + 0.0006, KERF * MM]} />
            </mesh>
          )}
        </>
      )}
      {!falling && !hole && (
        // Hovers just above the line while you aim, sinks into the kerf while you saw.
        <group position={[s.phase === 'align' ? -w / 2 * MM + 0.02 : sawX, top + (s.phase === 'align' ? 0.03 : 0.012), kerfZ]} rotation={[0, 0, -0.3]}>
          <mesh material={steel} position={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[0.2, 0.04, 0.0005]} />
          </mesh>
          <mesh material={rattan} position={[0.3, 0.008, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.2, 12]} />
          </mesh>
        </group>
      )}
      {!falling && !hole && s.phase === 'align' && (
        // Where the blade will enter: a thin line the width of the kerf.
        <mesh material={bladeMark} position={[0, top + 0.0008, kerfZ]}>
          <boxGeometry args={[w * MM + 0.01, 0.0002, KERF * MM]} />
        </mesh>
      )}
      {!falling && hole && (
        <mesh material={steel} position={[0, top + 0.12 - s.progress * 0.1, lineZ]} castShadow>
          <cylinderGeometry args={[0.031, 0.031, 0.06, 32, 1, true]} />
        </mesh>
      )}
      <points geometry={dustGeo} material={dustMat} frustumCulled={false} />
    </group>
  )
}
