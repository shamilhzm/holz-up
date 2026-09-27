import { useLayoutEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { useStore } from '../state/store'
import { BUILD_STEPS, CHAPTERS } from '../content/chapters'
import { DeskModel } from './DeskModel'
import { Room } from './Room'

/** Shift the rendered image so the desk sits in the space not covered by the side panels. */
function CenterInFreeSpace() {
  const chapter = useStore((s) => s.chapter)
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    const id = CHAPTERS[chapter]?.id
    const wide = id === 'documents' || id === 'material'
    const left = (wide ? Math.min(size.width * 0.64, 940) : 410) + 16
    const right = wide ? 0 : 346
    const shift = size.width > 900 ? (left - right) / 2 : 0
    const cam = camera as import('three').PerspectiveCamera
    cam.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height)
    cam.updateProjectionMatrix()
    invalidate()
  }, [chapter, camera, size, invalidate])
  return null
}

export function Scene() {
  const params = useStore((s) => s.params)
  const height = useStore((s) => s.height)
  const cutaway = useStore((s) => s.cutaway)
  const focusStep = useStore((s) => s.focusStep)
  const highlight = BUILD_STEPS.find((b) => b.id === focusStep)?.highlight ?? []

  return (
    <Canvas frameloop="demand" shadows="soft" dpr={[1, 2]} camera={{ position: [2.1, 1.45, 2.3], fov: 35 }} gl={{ preserveDrawingBuffer: true }}>
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
      <DeskModel params={params} height={height} cutaway={cutaway} highlight={highlight} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={4} blur={2.4} far={1.2} frames={1} />
      <CenterInFreeSpace />
      <OrbitControls target={[0, 0.62, 0]} enableDamping minDistance={1.1} maxDistance={5} maxPolarAngle={1.52} makeDefault />
    </Canvas>
  )
}
