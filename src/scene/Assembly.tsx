import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { parts } from '../model/desk'
import type { Part, Vec3 } from '../model/types'
import { STEPS } from '../game/build'
import { useLive } from '../game/live'
import { knock } from '../game/audio'
import type { Progress } from '../game/progress'
import { useStore } from '../state/store'
import { DeskModel, type Look } from './DeskModel'
import { hashString, makeWoodMaterial } from './woodMaterial'

const MM = 0.001
const clampSteel = new THREE.MeshStandardMaterial({ color: '#4a4d52', metalness: 0.7, roughness: 0.35 })
const clampRed = new THREE.MeshStandardMaterial({ color: '#b3412e', roughness: 0.5 })
const SNAP_PX = 90

export function Assembly({ prog }: { prog: Progress }) {
  const params = useStore((s) => s.params)
  const build = useStore((s) => s.build)
  const place = useStore((s) => s.place)
  const heldKey = useLive((s) => s.heldKey)
  const hoverSlot = useLive((s) => s.hoverSlot)
  const clamping = useLive((s) => s.clamping)
  const { camera, gl, invalidate } = useThree()
  const all = useMemo(() => parts(params), [params])
  const stepIndex = (p: Part) => STEPS.findIndex((s) => s.id === p.step)

  const lookOf = useMemo(
    () => (p: Part): Look => {
      if (build.placed[p.id]) return 'solid'
      const i = stepIndex(p)
      if (i === prog.stepIndex && prog.mode === 'assemble') return p.id === hoverSlot ? 'hidden' : 'ghost'
      return i < prog.stepIndex ? 'solid' : 'faint'
    },
    [build.placed, prog.stepIndex, prog.mode, hoverSlot],
  )
  const errorOf = useMemo(() => (p: Part) => {
    const j = prog.jobOf(p.id)
    return j ? build.cuts[j.key] ?? 0 : 0
  }, [prog, build.cuts])

  const slots = useMemo(() => prog.remaining.filter((p) => prog.jobOf(p.id)?.key === heldKey), [prog, heldKey])
  const held = slots[0]
  const heldMesh = useRef<THREE.Mesh>(null)
  const heldGeo = useMemo(() => (held ? new THREE.BoxGeometry(...(held.size.map((v) => v * MM) as Vec3)) : null), [held])
  const heldMat = useMemo(() => (held && held.species !== 'granite' ? makeWoodMaterial({ species: held.species, grain: held.grain, size: held.size, seed: hashString(held.id), oiled: true }) : null), [held])

  // Drag: the held part follows the pointer and snaps to the nearest matching slot on screen.
  useEffect(() => {
    if (!heldKey) return
    const el = gl.domElement
    const v = new THREE.Vector3()
    const ray = new THREE.Raycaster()
    const plane = new THREE.Plane()
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left
      const py = e.clientY - r.top
      let best: string | null = null
      let bestD = SNAP_PX
      for (const s of slots) {
        v.set(...(s.pos.map((c) => c * MM) as Vec3)).project(camera)
        const d = Math.hypot(((v.x + 1) / 2) * r.width - px, ((1 - v.y) / 2) * r.height - py)
        if (d < bestD) { bestD = d; best = s.id }
      }
      useLive.getState().set({ hoverSlot: best })
      if (heldMesh.current) {
        const snap = slots.find((s) => s.id === best)
        if (snap) heldMesh.current.position.set(...(snap.pos.map((c) => c * MM) as Vec3))
        else {
          ray.setFromCamera(new THREE.Vector2((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1), camera)
          plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(v).negate(), new THREE.Vector3(0, 0.45, 0.2))
          const hit = new THREE.Vector3()
          if (ray.ray.intersectPlane(plane, hit)) heldMesh.current.position.copy(hit)
        }
      }
      invalidate()
    }
    const onUp = () => {
      const slot = useLive.getState().hoverSlot
      if (slot) {
        place(slot)
        knock(260, 0.6)
      }
      useLive.getState().set({ heldKey: null, hoverSlot: null })
      invalidate()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [heldKey, slots, camera, gl, place, invalidate])

  // Clamps across the thin axis of each part in the step being glued.
  const clamps = useMemo(() => {
    if (!clamping) return []
    const step = STEPS[prog.stepIndex]?.id
    return all.filter((p) => p.step === step && p.shape === 'box' && p.kind !== 'ballast').slice(0, 10).map((p) => {
      const thin = p.size.indexOf(Math.min(...p.size))
      return { key: p.id, pos: p.pos.map((c) => c * MM) as Vec3, along: thin, span: (p.size[thin] + 60) * MM }
    })
  }, [clamping, all, prog.stepIndex])
  const t0 = useRef(0)
  useFrame((_, dt) => {
    if (!clamping) return
    t0.current += dt
    invalidate()
  })

  const cobbles: [number, number] = prog.stepIndex > STEPS.findIndex((s) => s.id === 'weights') || prog.mode === 'tune' || prog.mode === 'done' ? build.cobbles : [0, 0]
  return (
    <group>
      <DeskModel params={params} height={params.sitHeight} lookOf={lookOf} errorOf={errorOf} cobbles={cobbles} showProps={prog.mode === 'done'} cutaway={prog.mode === 'tune'} />
      {held && heldGeo && heldMat && <mesh ref={heldMesh} geometry={heldGeo} material={heldMat} castShadow position={[0, 0.9, 0.5]} />}
      {clamps.map((c) => (
        <group key={c.key} position={c.pos} rotation={c.along === 0 ? [0, 0, Math.PI / 2] : c.along === 2 ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <mesh material={clampSteel}>
            <boxGeometry args={[0.012, c.span + 0.04, 0.025]} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} material={k > 0 ? clampRed : clampSteel} position={[0.035, (k * c.span) / 2, 0]}>
              <boxGeometry args={[0.07, 0.014, 0.03]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
