import { useMemo } from 'react'
import { parts } from '../model/desk'
import { pieces, planCuts } from '../model/cutlist'
import { SKUS } from '../model/stock'
import { useStore } from '../state/store'
import { hashString, makeWoodMaterial } from './woodMaterial'

const MM = 0.001

/** The boards you bought, stacked flat on spacer sticks to acclimatise (Stapelleisten). */
export function LumberStack() {
  const params = useStore((s) => s.params)
  const sheets = useMemo(() => planCuts(pieces(parts(params)), SKUS).sheets.filter((s) => s.sku.kind === 'panel'), [params])
  const stickMat = useMemo(() => makeWoodMaterial({ species: 'pine', grain: 'z', size: [20, 20, 900], seed: 11 }), [])
  let y = 0
  return (
    <group position={[-1.5, 0, 0.35]} rotation={[0, Math.PI / 2 + 0.04, 0]}>
      {[...sheets].sort((a, b) => b.sku.L * b.sku.W - a.sku.L * a.sku.W).map((s, i) => {
        const t = s.sku.t * MM
        const sy = y + 0.02 + t / 2
        y += t + 0.02
        const species = s.sku.material.startsWith('beech') ? 'beech' : 'pine'
        const mat = makeWoodMaterial({ species, grain: 'x', size: [s.sku.L, s.sku.t, s.sku.W], seed: hashString(`${s.sku.id}${i}`) })
        return (
          <group key={i}>
            {[-0.35, 0.35].map((x) => (
              <mesh key={x} material={stickMat} position={[x, y - t - 0.01, 0]}>
                <boxGeometry args={[0.02, 0.02, 0.8]} />
              </mesh>
            ))}
            <mesh material={mat} position={[0, sy, 0]} castShadow receiveShadow>
              <boxGeometry args={[s.sku.L * MM, t, s.sku.W * MM]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
