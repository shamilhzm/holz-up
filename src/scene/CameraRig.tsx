import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { frameDt } from './frame'

export type View = 'room' | 'cut' | 'assemble'

const PRESETS: Record<View, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  room: { pos: new THREE.Vector3(2.35, 1.5, 2.55), look: new THREE.Vector3(0, 0.6, 0) },
  cut: { pos: new THREE.Vector3(0, 1.13, 0.43), look: new THREE.Vector3(0, 0.64, 0.1) },
  assemble: { pos: new THREE.Vector3(1.75, 1.45, 2.15), look: new THREE.Vector3(0, 0.42, 0) },
}

export interface Focus { pos: THREE.Vector3; look: THREE.Vector3 }

/** Glides the camera to a preset (or a given focus) whenever it changes; free orbit afterwards. */
export function CameraRig({ view, focus, focusKey }: { view: View; focus?: Focus; focusKey?: string }) {
  const { camera, controls, invalidate } = useThree() as unknown as { camera: THREE.Camera; controls: { target: THREE.Vector3; update: () => void } | null; invalidate: () => void }
  const goal = useRef<(typeof PRESETS)[View] | null>(PRESETS[view])
  useEffect(() => {
    goal.current = focus ?? PRESETS[view]
    invalidate()
    // focusKey identifies the focus; the object itself is rebuilt every render.
  }, [view, focusKey, invalidate])
  useFrame((_, dt) => {
    // A scripted camera (video recording) takes over while `holzCinema` is set.
    if ((window as { holzCinema?: boolean }).holzCinema) return
    const g = goal.current
    if (!g || !controls) return
    const k = Math.min(1, frameDt(dt) * 3.5)
    camera.position.lerp(g.pos, k)
    controls.target.lerp(g.look, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.003 && controls.target.distanceTo(g.look) < 0.003) goal.current = null
    invalidate()
  })
  return null
}
