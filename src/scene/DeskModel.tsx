import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { C, COBBLE_KG, ballastPerBoxKg, geometry, parts, type DeskParams } from '../model/desk'
import { AXIS_INDEX, type Part, type Vec3 } from '../model/types'
import { hashString, makeWoodMaterial } from './woodMaterial'
import { frameDt } from './frame'

const MM = 0.001
const HIGHLIGHT = new THREE.Color('#ff9d3c')
const ROUNDED = new Set(['top', 'side', 'cap', 'drawer-front', 'handle', 'plinth', 'rail', 'batten'])

/** solid = built, ghost = goes here next, faint = later step, hidden = not shown. */
export type Look = 'solid' | 'ghost' | 'faint' | 'hidden'

function partGeometry(p: Part, size: Vec3): THREE.BufferGeometry {
  const [x, y, z] = size.map((v) => v * MM)
  if (p.shape === 'box') return ROUNDED.has(p.kind) ? new RoundedBoxGeometry(x, y, z, 2, 0.0022) : new THREE.BoxGeometry(x, y, z)
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

const granite = new THREE.MeshStandardMaterial({ color: '#8f8b86', roughness: 0.95 })
const sand = new THREE.MeshStandardMaterial({ color: '#d8c49a', roughness: 1 })
const cordMat = new THREE.MeshStandardMaterial({ color: '#d9ccb0', roughness: 1 })
const markMat = new THREE.MeshBasicMaterial({ color: '#3b2a1c' })
const gripMat = new THREE.MeshStandardMaterial({ color: '#2b2018', roughness: 0.9 })
export const ghostMat = new THREE.MeshStandardMaterial({ color: '#f59a3a', emissive: '#ff8a1f', emissiveIntensity: 0.7, transparent: true, opacity: 0.5, depthWrite: false })
const lineMat = new THREE.LineBasicMaterial({ color: '#6f8aa0', transparent: true, opacity: 0.55 })
const ghostLineMat = new THREE.LineBasicMaterial({ color: '#e0761c' })

interface Mesh {
  key: string
  owner: Part
  geo: THREE.BufferGeometry
  mat: THREE.Material
  pos: Vec3
  edges?: THREE.EdgesGeometry
}

/** Blueprint outline of a part, built on first use. */
function edgesOf(m: Mesh) {
  m.edges ??= new THREE.EdgesGeometry(m.geo, 25)
  return m.edges
}

interface Props {
  params: DeskParams
  height: number
  cutaway?: boolean
  highlight?: string[]
  /** Per-part look; default solid. Ghosts show where a part goes. */
  lookOf?: (p: Part) => Look
  /** Cut error in mm per part: short parts render short (visible gap). */
  errorOf?: (p: Part) => number
  /** Cobbles loaded per weight box; default = the balanced amount. */
  cobbles?: [number, number]
  showProps?: boolean
}

/** The desk built from the parametric model; `height` is eased towards in the frame loop. */
export function DeskModel({ params, height, cutaway = false, highlight = [], lookOf, errorOf, cobbles, showProps = true }: Props) {
  const all = useMemo(() => parts(params), [params])
  const g = useMemo(() => geometry(params), [params])
  const moving = useRef<THREE.Group>(null)
  const ballast = useRef<THREE.Group>(null)
  const cords = useRef<THREE.Group>(null)
  const shown = useRef(height)

  const meshes = useMemo(() => {
    const out: Mesh[] = []
    const W = C.wall
    const wood = (p: Part, key: string, size: Vec3, grain = p.grain) =>
      makeWoodMaterial({ species: p.species === 'granite' ? 'pine' : p.species, grain, size, seed: hashString(key), oiled: true })
    for (const p of all) {
      if (p.kind === 'ballast') continue
      const err = errorOf?.(p) ?? 0
      let size: Vec3 = [...p.size]
      let pos: Vec3 = [...p.pos]
      // A part cut short shows its gap: shrink it along the grain.
      if (err < -1.5 && p.shape === 'box') size[AXIS_INDEX[p.grain]] += err
      if (p.kind === 'cap') size = [p.size[0] - 2 * W, p.size[1], p.size[2]]
      if (p.kind === 'side') {
        size = [p.size[0], p.size[1] - W, p.size[2]]
        pos = [p.pos[0], p.pos[1] - W / 2, p.pos[2]]
      }
      out.push({ key: p.id, owner: p, geo: partGeometry(p, size), mat: wood(p, p.id, size), pos })
      if (p.kind === 'drawer-front') {
        out.push({ key: `${p.id}-grip`, owner: p, geo: new RoundedBoxGeometry(0.09, 0.022, 0.002, 2, 0.006), mat: gripMat, pos: [p.pos[0], p.pos[1] + p.size[1] / 2 - 32, p.pos[2] + W / 2] })
      }
    }
    // Finger joints where each side meets the cap: alternate fingers of side (end grain up)
    // and cap (end grain out).
    for (const side of all.filter((p) => p.kind === 'side')) {
      const cap = all.find((p) => p.id === `cap-${side.id.slice(-1)}`)!
      const n = 13
      const D = side.size[2]
      for (let i = 0; i < n; i++) {
        const owner = i % 2 === 0 ? side : cap
        const size: Vec3 = [W, W, D / n]
        const key = `${side.id}-finger-${i}`
        out.push({ key, owner, geo: new THREE.BoxGeometry(...(size.map((v) => v * MM) as Vec3)), mat: wood(owner, key, size, owner === side ? 'y' : 'x'), pos: [side.pos[0], g.pedTop - W / 2, -D / 2 + (i + 0.5) * (D / n)] })
      }
    }
    return out
  }, [all, g, errorOf])

  useMemo(() => {
    for (const m of meshes) {
      if (m.mat instanceof THREE.MeshStandardMaterial && m.mat !== gripMat) {
        m.mat.emissive.copy(highlight.includes(m.owner.kind) ? HIGHLIGHT : new THREE.Color(0))
        m.mat.emissiveIntensity = 0.35
      }
    }
  }, [meshes, highlight])

  const cobbleMeshes = useMemo(() => {
    if (params.ballast === 'none') return []
    const ideal = Math.round(ballastPerBoxKg(params) / COBBLE_KG)
    const counts = cobbles ?? [ideal, ideal]
    const floors = all.filter((p) => p.kind === 'box-floor')
    const out: { key: string; pos: Vec3; rot: number; mat: THREE.Material }[] = []
    floors.forEach((f, side) => {
      const inner: Vec3 = [g.box[0] - 2 * C.wall, 0, g.box[2] - 2 * C.wall]
      const n = params.ballast === 'sand' ? 0 : counts[side] ?? 0
      for (let i = 0; i < n; i++) {
        const layer = Math.floor(i / 4)
        const cx = (i % 2) - 0.5
        const cz = (Math.floor(i / 2) % 2) - 0.5
        const r = hashString(`${f.id}${i}`) / 2 ** 32
        out.push({ key: `${f.id}-c${i}`, pos: [f.pos[0] + cx * inner[0] * 0.5, f.pos[1] + C.wall / 2 + 40 + layer * 78, f.pos[2] + cz * inner[2] * 0.5], rot: r * 0.6 - 0.3, mat: granite })
      }
    })
    return out
  }, [all, g, params, cobbles])

  const sandFill = params.ballast === 'sand' ? all.filter((p) => p.kind === 'ballast') : []

  // Gym-style height scale engraved on each column: the mark level with the pedestal top reads the height.
  const marks = useMemo(() => {
    const out: { x: number; y: number; long: boolean }[] = []
    for (const h of g.detents) {
      const y = g.pedTop - (h - params.sitHeight)
      for (const s of [-1, 1]) out.push({ x: s * g.xc, y, long: (h - params.sitHeight) % 50 === 0 })
    }
    return out
  }, [g, params.sitHeight])

  useFrame(({ invalidate }, dt) => {
    const gap = height - shown.current
    shown.current = Math.abs(gap) < 0.2 ? height : shown.current + gap * Math.min(1, frameDt(dt) * 6)
    if (shown.current !== height) invalidate()
    const d = (shown.current - params.sitHeight) * MM
    if (moving.current) moving.current.position.y = d
    if (ballast.current) ballast.current.position.y = -d / params.tackle
    cords.current?.children.forEach((c) => {
      const { from } = c.userData as { from: 'col' | 'pulley' }
      const y0 = from === 'col' ? (g.colBottomSit + 20) * MM + d : g.pulleyY * MM
      const y1 = from === 'col' ? g.pulleyY * MM : (g.boxTopSit + (params.tackle === 2 ? C.sheaveD / 2 : 0)) * MM - d / params.tackle
      c.position.y = (y0 + y1) / 2
      c.scale.y = Math.max(0.001, Math.abs(y1 - y0))
    })
  })

  const render = (grp: Part['group']) =>
    meshes
      .filter((m) => m.owner.group === grp && !(cutaway && m.owner.skin))
      .map((m) => {
        const look = lookOf?.(m.owner) ?? 'solid'
        if (look === 'hidden') return null
        const pos = m.pos.map((v) => v * MM) as Vec3
        if (look === 'faint') return <lineSegments key={m.key} geometry={edgesOf(m)} material={lineMat} position={pos} />
        if (look === 'ghost')
          return (
            <group key={m.key} position={pos}>
              <mesh geometry={m.geo} material={ghostMat} name={m.key} />
              <lineSegments geometry={edgesOf(m)} material={ghostLineMat} />
            </group>
          )
        return <mesh key={m.key} geometry={m.geo} material={m.mat} position={pos} castShadow receiveShadow name={m.key} />
      })

  const pulleyZ = -(C.columnZ / 2 + C.wall / 2)
  const weightsVisible = !lookOf || all.some((p) => p.kind === 'box-floor' && lookOf(p) === 'solid')
  return (
    <group>
      <group>{render('fixed')}</group>
      <group ref={moving}>
        {render('moving')}
        {(!lookOf || all.some((p) => p.kind === 'column' && lookOf(p) === 'solid')) &&
          marks.map((m, i) => (
            <mesh key={i} material={markMat} position={[m.x * MM, m.y * MM, (C.columnZ / 2 + 0.3) * MM]}>
              <boxGeometry args={[(m.long ? 22 : 12) * MM, 1.2 * MM, 0.4 * MM]} />
            </mesh>
          ))}
        {showProps && <DeskProps params={params} />}
      </group>
      <group ref={ballast}>
        {render('ballast')}
        {weightsVisible && cobbleMeshes.map((c) => (
          <mesh key={c.key} material={c.mat} position={c.pos.map((v) => v * MM) as Vec3} rotation={[0, c.rot, 0]} castShadow>
            <boxGeometry args={[0.092, 0.074, 0.092]} />
          </mesh>
        ))}
        {weightsVisible && sandFill.map((s) => (
          <mesh key={s.id} material={sand} position={s.pos.map((v) => v * MM) as Vec3}>
            <boxGeometry args={s.size.map((v) => v * MM) as Vec3} />
          </mesh>
        ))}
      </group>
      {weightsVisible && (
        <group ref={cords}>
          {[-1, 1].flatMap((s) => [
            { key: `c${s}a`, x: s * g.xc, z: pulleyZ + C.pulleyD / 2, from: 'col' },
            { key: `c${s}b`, x: s * g.xc, z: pulleyZ - C.pulleyD / 2, from: 'pulley' },
          ]).map((c) => (
            <mesh key={c.key} material={cordMat} position={[c.x * MM, 0, c.z * MM]} userData={{ from: c.from }}>
              <cylinderGeometry args={[3 * MM, 3 * MM, 1, 6]} />
            </mesh>
          ))}
        </group>
      )}
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
      <mesh material={ceramic} position={[0.3, 0.045, 0.12]} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.09, 24]} />
      </mesh>
      {book.map((m, i) => (
        <mesh key={i} material={m} position={[-0.5, 0.012 + i * 0.024, -0.18]} rotation={[0, 0.1 * i - 0.1, 0]} castShadow>
          <boxGeometry args={[0.22, 0.022, 0.16]} />
        </mesh>
      ))}
      <group position={[0.5, 0, -0.2]}>
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
