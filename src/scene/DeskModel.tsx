import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, geometry, parts, type DeskParams } from '../model/desk'
import type { Part } from '../model/types'
import { hashString, makeWoodMaterial } from './woodMaterial'

const MM = 0.001
const HIGHLIGHT = new THREE.Color('#ff9d3c')

function partGeometry(p: Part): THREE.BufferGeometry {
  const [x, y, z] = p.size.map((v) => v * MM)
  if (p.shape === 'box') return new THREE.BoxGeometry(x, y, z)
  // Cylinder axis = the one dimension that differs from the other two.
  const s = p.size
  const axis = s[1] === s[2] && s[0] !== s[1] ? 0 : s[0] === s[2] && s[1] !== s[0] ? 1 : 2
  const len = [x, y, z][axis]
  const d = [x, y, z][(axis + 1) % 3]
  const g = new THREE.CylinderGeometry(d / 2, d / 2, len, 32)
  if (axis === 0) g.rotateZ(Math.PI / 2)
  if (axis === 2) g.rotateX(Math.PI / 2)
  return g
}

const granite = new THREE.MeshStandardMaterial({ color: '#8d8a86', roughness: 0.95 })
const cordMat = new THREE.MeshStandardMaterial({ color: '#d9ccb0', roughness: 1 })
const markMat = new THREE.MeshBasicMaterial({ color: '#3b2a1c' })

interface Props {
  params: DeskParams
  height: number
  cutaway: boolean
  highlight: string[]
  oiled?: boolean
}

/** The desk built from the parametric model; `height` is eased towards in the frame loop. */
export function DeskModel({ params, height, cutaway, highlight, oiled = true }: Props) {
  const all = useMemo(() => parts(params), [params])
  const g = useMemo(() => geometry(params), [params])
  const moving = useRef<THREE.Group>(null)
  const ballast = useRef<THREE.Group>(null)
  const cords = useRef<THREE.Group>(null)
  const shown = useRef(height)

  const meshes = useMemo(
    () =>
      all.map((p) => ({
        part: p,
        geo: partGeometry(p),
        mat: p.species === 'granite' ? granite : makeWoodMaterial({ species: p.species, grain: p.grain, size: p.size, seed: hashString(p.id), oiled }),
      })),
    [all, oiled],
  )

  useMemo(() => {
    for (const m of meshes) {
      if (m.mat instanceof THREE.MeshStandardMaterial && m.mat !== granite) {
        m.mat.emissive.copy(highlight.includes(m.part.kind) ? HIGHLIGHT : new THREE.Color(0))
        m.mat.emissiveIntensity = 0.35
      }
    }
  }, [meshes, highlight])

  // Gym-style height scale engraved on each column's front face: the mark level with the end
  // panel's top edge reads the current height.
  const marks = useMemo(() => {
    const out: { x: number; y: number; long: boolean }[] = []
    for (const h of g.detents) {
      const y = g.wangeTop - (h - params.sitHeight)
      for (const s of [-1, 1]) out.push({ x: s * g.xc, y, long: (h - params.sitHeight) % 50 === 0 })
    }
    return out
  }, [g, params.sitHeight])

  useFrame(({ invalidate }, dt) => {
    const gap = height - shown.current
    shown.current = Math.abs(gap) < 0.2 ? height : shown.current + gap * Math.min(1, dt * 6)
    if (shown.current !== height) invalidate()
    const d = (shown.current - params.sitHeight) * MM
    if (moving.current) moving.current.position.y = d
    if (ballast.current) ballast.current.position.y = -d / params.tackle
    // Cords: column side shortens as the top rises, weight side lengthens.
    cords.current?.children.forEach((c) => {
      const { from, to } = c.userData as { from: 'col' | 'pulley'; to: 'pulley' | 'box' }
      const y0 = from === 'col' ? (g.colBottomSit + 20) * MM + d : g.pulleyY * MM
      const y1 = to === 'pulley' ? g.pulleyY * MM : (g.boxTopSit + (params.tackle === 2 ? C.sheaveD / 2 : 0)) * MM - d / params.tackle
      c.position.y = (y0 + y1) / 2
      c.scale.y = Math.max(0.001, Math.abs(y1 - y0))
    })
  })

  const group = (grp: Part['group']) =>
    meshes
      .filter((m) => m.part.group === grp && !(cutaway && m.part.skin))
      .map(({ part, geo, mat }) => (
        <mesh key={part.id} geometry={geo} material={mat} position={part.pos.map((v) => v * MM) as [number, number, number]} castShadow receiveShadow name={part.id} />
      ))

  const cordZ = C.columnZ / 2 + C.wall / 2
  return (
    <group>
      <group>{group('fixed')}</group>
      <group ref={moving}>
        {group('moving')}
        {marks.map((m, i) => (
          <mesh key={i} material={markMat} position={[m.x * MM, m.y * MM, (C.columnZ / 2 + 0.3) * MM]}>
            <boxGeometry args={[(m.long ? 22 : 12) * MM, 1.2 * MM, 0.4 * MM]} />
          </mesh>
        ))}
        <DeskProps params={params} />
      </group>
      <group ref={ballast}>{group('ballast')}</group>
      <group ref={cords}>
        {[-1, 1].flatMap((s) =>
          [-1, 1].flatMap((f) => [
            { key: `c${s}${f}a`, x: s * g.xc, z: f * (cordZ - C.pulleyD / 2), from: 'col', to: 'pulley' },
            { key: `c${s}${f}b`, x: s * g.xc, z: f * (cordZ + C.pulleyD / 2), from: 'pulley', to: 'box' },
          ]),
        ).map((c) => (
          <mesh key={c.key} material={cordMat} position={[c.x * MM, 0, c.z * MM]} userData={{ from: c.from, to: c.to }}>
            <cylinderGeometry args={[3 * MM, 3 * MM, 1, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

const dark = new THREE.MeshStandardMaterial({ color: '#3a3a3c', roughness: 0.5, metalness: 0.3 })
const screen = new THREE.MeshStandardMaterial({ color: '#1d2a25', roughness: 0.2, emissive: '#2f4a3c', emissiveIntensity: 0.4 })
const ceramic = new THREE.MeshStandardMaterial({ color: '#e9e2d4', roughness: 0.35 })
const leaf = new THREE.MeshStandardMaterial({ color: '#5f7d4a', roughness: 0.7 })
const clay = new THREE.MeshStandardMaterial({ color: '#b86f4c', roughness: 0.85 })
const book = ['#8e5b45', '#6d7b5a', '#c9b48a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }))

/** A few things on the desk so it looks lived-in (and shows what the ballast carries). */
function DeskProps({ params }: { params: DeskParams }) {
  const y = params.sitHeight * MM
  return (
    <group position={[0, y, 0]}>
      <group position={[-0.05, 0, 0.06]}>
        <mesh material={dark} position={[0, 0.008, 0]} castShadow>
          <boxGeometry args={[0.32, 0.016, 0.22]} />
        </mesh>
        <mesh material={screen} position={[0, 0.115, -0.105]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.32, 0.21, 0.008]} />
        </mesh>
      </group>
      <mesh material={ceramic} position={[0.28, 0.045, 0.12]} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.09, 24]} />
      </mesh>
      {book.map((m, i) => (
        <mesh key={i} material={m} position={[-0.42, 0.012 + i * 0.024, -0.18]} rotation={[0, 0.1 * i - 0.1, 0]} castShadow>
          <boxGeometry args={[0.22, 0.022, 0.16]} />
        </mesh>
      ))}
      <group position={[0.42, 0, -0.2]}>
        <mesh material={clay} position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.045, 0.1, 20]} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} material={leaf} position={[Math.cos(i) * 0.04, 0.15 + (i % 3) * 0.03, Math.sin(i) * 0.04]} rotation={[Math.cos(i) * 0.6, i, Math.sin(i) * 0.6]} scale={[1, 0.25, 0.55]} castShadow>
            <sphereGeometry args={[0.06, 12, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
