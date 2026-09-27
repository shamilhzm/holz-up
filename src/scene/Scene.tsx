import { useLayoutEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Vector3, type PerspectiveCamera } from 'three'
import { useStore } from '../state/store'
import { BUILD_STEPS, CHAPTERS } from '../content/chapters'
import { parts } from '../model/desk'
import { progress } from '../game/progress'
import { STEPS } from '../game/build'
import { useLive } from '../game/live'
import { DeskModel } from './DeskModel'
import { Room } from './Room'
import { CutStation } from './CutStation'
import { Assembly } from './Assembly'
import { CameraRig, type Focus, type View } from './CameraRig'
import { LumberStack } from './LumberStack'

/** Shift the rendered image so the subject sits in the space not covered by the side panels. */
function CenterInFreeSpace({ wide, right }: { wide: boolean; right: boolean }) {
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    const left = (wide ? Math.min(size.width * 0.64, 940) : 410) + 16
    const shift = size.width > 900 ? (left - (right ? 346 : 0)) / 2 : 0
    const cam = camera as PerspectiveCamera
    cam.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height)
    cam.updateProjectionMatrix()
    invalidate()
  }, [wide, right, camera, size, invalidate])
  return null
}

export function Scene() {
  const station = useStore((s) => CHAPTERS[s.station]?.id ?? 'plan')
  const params = useStore((s) => s.params)
  const height = useStore((s) => s.height)
  const cutaway = useStore((s) => s.cutaway)
  const build = useStore((s) => s.build)
  const focusStep = useStore((s) => s.focusStep)
  const holding = useLive((s) => s.heldKey !== null)
  const all = useMemo(() => parts(params), [params])
  const prog = useMemo(() => progress(all, build), [all, build])
  const highlight = BUILD_STEPS.find((b) => b.id === focusStep)?.highlight ?? []

  const workshop = station === 'workshop' && build.bought
  const view: View = workshop ? (prog.mode === 'cut' ? 'cut' : 'assemble') : 'room'
  const built = prog.mode === 'done'
  // Frame the parts of the current assembly step.
  const stepId = STEPS[prog.stepIndex]?.id
  const focus = useMemo<Focus | undefined>(() => {
    if (view !== 'assemble' || !stepId) return undefined
    // Counterweights hide behind the dividers: look into the right pedestal from its open side.
    const ps = all.filter((p) => p.step === stepId && (stepId !== 'weights' || p.pos[0] > 0))
    const lo = new Vector3(Infinity, Infinity, Infinity)
    const hi = new Vector3(-Infinity, -Infinity, -Infinity)
    for (const p of ps) {
      lo.min(new Vector3(...p.pos.map((v, i) => (v - p.size[i] / 2) / 1000)))
      hi.max(new Vector3(...p.pos.map((v, i) => (v + p.size[i] / 2) / 1000)))
    }
    const look = lo.clone().add(hi).multiplyScalar(0.5)
    const size = hi.distanceTo(lo)
    const dir = stepId === 'weights' ? new Vector3(1.3, 0.45, 0.15) : new Vector3(0.9, 0.85, 1.25)
    return { look, pos: look.clone().add(dir.normalize().multiplyScalar(Math.max(1.2, size * 1.35))) }
  }, [view, stepId, all])
  const errorOf = useMemo(() => (built ? (p: { id: string }) => build.cuts[prog.jobOf(p.id)?.key ?? ''] ?? 0 : undefined), [built, build.cuts, prog])

  return (
    <Canvas frameloop="demand" shadows dpr={[1, 2]} camera={{ position: [2.35, 1.5, 2.55], fov: 35 }} gl={{ preserveDrawingBuffer: true }}>
      <color attach="background" args={['#efe6d8']} />
      <hemisphereLight args={['#fff4e2', '#a07850', 0.55]} />
      <directionalLight
        position={[-4, 3.2, 1.2]}
        intensity={2.6}
        color="#ffe2b8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2.5}
        shadow-camera-bottom={-2.5}
      />
      <pointLight position={[1.2, 2.2, 1.6]} intensity={1.2} color="#ffd9a8" distance={6} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#fff0d8" position={[-3, 2, 0]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#f3e3cc" position={[2, 3, 2]} scale={[4, 4, 1]} />
      </Environment>
      <Room />
      {workshop ? (
        prog.mode === 'cut' && prog.job ? <CutStation job={prog.job} /> : <Assembly prog={prog} />
      ) : (
        <DeskModel params={params} height={height} cutaway={cutaway} highlight={highlight} cobbles={built ? build.cobbles : undefined} errorOf={errorOf} />
      )}
      {station === 'shop' && build.bought && <LumberStack />}
      {view !== 'cut' && <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={4} blur={2.4} far={1.2} frames={1} key={view} />}
      <CenterInFreeSpace wide={station === 'shop'} right={station === 'plan' || station === 'test'} />
      <OrbitControls target={[0, 0.6, 0]} enableDamping minDistance={0.35} maxDistance={5} maxPolarAngle={1.52} enabled={view !== 'cut' && !holding} makeDefault />
      <CameraRig view={view} focus={focus} focusKey={view === 'assemble' ? stepId : undefined} />
    </Canvas>
  )
}
