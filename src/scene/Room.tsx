import { useMemo } from 'react'
import * as THREE from 'three'
import { hashString, makeWoodMaterial } from './woodMaterial'

const plaster = new THREE.MeshStandardMaterial({ color: '#efe5d6', roughness: 0.95 })
const plasterShade = new THREE.MeshStandardMaterial({ color: '#e6dac7', roughness: 0.95 })
const rug = new THREE.MeshStandardMaterial({ color: '#d8ccb6', roughness: 1 })
const glass = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#fff1d0', emissiveIntensity: 1.3, roughness: 0.2 })
const leaf = new THREE.MeshStandardMaterial({ color: '#58764a', roughness: 0.7 })
const clay = new THREE.MeshStandardMaterial({ color: '#b5714f', roughness: 0.85 })
const canvas = new THREE.MeshStandardMaterial({ color: '#9fae8a', roughness: 0.9 })

const PLANK = 0.19
const ROOM = { back: -1.35, left: -2.2, width: 5.5, depth: 5 }

/** A warm corner of a room: plank floor, plaster walls, a sunny window, plants. */
export function Room() {
  const planks = useMemo(
    () =>
      Array.from({ length: Math.ceil(ROOM.depth / PLANK) }, (_, i) =>
        makeWoodMaterial({ species: 'oak', grain: 'x', size: [ROOM.width * 1000, 20, PLANK * 1000], seed: hashString(`plank${i}`), oiled: true }),
      ),
    [],
  )
  const frameMat = useMemo(() => makeWoodMaterial({ species: 'pine', grain: 'y', size: [60, 1400, 60], seed: 7, oiled: true }), [])

  return (
    <group>
      {planks.map((m, i) => (
        <mesh key={i} material={m} position={[ROOM.left + ROOM.width / 2 + ((i * 0.37) % 0.6), -0.01, ROOM.back + PLANK / 2 + i * PLANK]} receiveShadow>
          <boxGeometry args={[ROOM.width, 0.02, PLANK - 0.002]} />
        </mesh>
      ))}
      <mesh material={plaster} position={[ROOM.left + ROOM.width / 2, 1.4, ROOM.back]} receiveShadow>
        <boxGeometry args={[ROOM.width, 2.8, 0.05]} />
      </mesh>
      {/* Left wall with a window opening */}
      <group position={[ROOM.left, 0, 0]}>
        <mesh material={plasterShade} position={[0, 0.45, ROOM.back + ROOM.depth / 2]} receiveShadow>
          <boxGeometry args={[0.05, 0.9, ROOM.depth]} />
        </mesh>
        <mesh material={plasterShade} position={[0, 2.45, ROOM.back + ROOM.depth / 2]} receiveShadow>
          <boxGeometry args={[0.05, 0.7, ROOM.depth]} />
        </mesh>
        <mesh material={plasterShade} position={[0, 1.4, ROOM.back + 0.3]} receiveShadow>
          <boxGeometry args={[0.05, 1.2, 0.6]} />
        </mesh>
        <mesh material={plasterShade} position={[0, 1.4, ROOM.back + 2.65]} receiveShadow>
          <boxGeometry args={[0.05, 1.2, ROOM.depth - 2.6]} />
        </mesh>
        <mesh material={glass} position={[-0.03, 1.4, ROOM.back + 1.2]}>
          <boxGeometry args={[0.01, 1.2, 1.2]} />
        </mesh>
        {[[0, 0.93, 1.2, 0.06, 1.3], [0, 1.87, 1.2, 0.06, 1.3], [0, 1.4, 0.6, 1.0, 0.05], [0, 1.4, 1.8, 1.0, 0.05], [0, 1.4, 1.2, 0.9, 0.035]].map(([x, y, z, h, d], i) => (
          <mesh key={i} material={frameMat} position={[x + 0.03, y, ROOM.back + z]} castShadow>
            <boxGeometry args={[0.07, h, d]} />
          </mesh>
        ))}
      </group>
      <mesh material={rug} position={[0.1, 0.002, 0.25]} receiveShadow>
        <boxGeometry args={[2.1, 0.008, 1.5]} />
      </mesh>
      {/* Framed picture */}
      <group position={[0.2, 1.6, ROOM.back + 0.04]}>
        <mesh material={frameMat}>
          <boxGeometry args={[0.52, 0.66, 0.025]} />
        </mesh>
        <mesh material={canvas} position={[0, 0, 0.014]}>
          <boxGeometry args={[0.44, 0.58, 0.004]} />
        </mesh>
      </group>
      <Plant position={[-1.45, 0, -0.85]} scale={1.3} />
      <Plant position={[1.35, 0, -0.95]} scale={0.9} />
    </group>
  )
}

function Plant({ position, scale }: { position: [number, number, number]; scale: number }) {
  const leaves = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ a: i * 2.4, h: 0.35 + (i % 5) * 0.11, r: 0.08 + (i % 3) * 0.05 })),
    [],
  )
  return (
    <group position={position} scale={scale}>
      <mesh material={clay} position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.32, 24]} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} material={leaf} position={[Math.cos(l.a) * l.r, l.h + 0.2, Math.sin(l.a) * l.r]} rotation={[Math.cos(l.a) * 0.7, l.a, Math.sin(l.a) * 0.7]} scale={[1, 0.18, 0.5]} castShadow>
          <sphereGeometry args={[0.13, 12, 8]} />
        </mesh>
      ))}
    </group>
  )
}
