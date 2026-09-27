import { useMemo, useState } from 'react'
import { C, geometry, offsetAt, parts, type DeskParams } from '../model/desk'
import type { Part, Vec3 } from '../model/types'
import { Seg } from './common'

const VISIBLE = new Set(['side', 'cap', 'plinth', 'top', 'rail', 'handle', 'batten', 'drawer-front'])
const FILL: Record<string, string> = { pine: '#f1dfbb', beech: '#e3b993', granite: '#a19c95' }
const INK = '#2d2721'

interface Placed { part: Part; c: Vec3 }

/** Outline of a part projected onto the plane of axes (a, y). */
function outline({ part, c }: Placed, a: 0 | 2) {
  const s = part.size
  if (part.shape === 'cylinder' && a === 2 && s[1] === s[2]) return { circle: true, cx: c[a], cy: c[1], r: s[1] / 2 }
  return { circle: false, x: c[a] - s[a] / 2, y: c[1] - s[1] / 2, w: s[a], h: s[1] }
}

function Shape({ p, a, style }: { p: Placed; a: 0 | 2; style: 'visible' | 'hidden' | 'section' }) {
  const o = outline(p, a)
  const common = {
    stroke: INK,
    strokeWidth: style === 'hidden' ? 1.5 : 2.5,
    strokeDasharray: style === 'hidden' ? '10 7' : undefined,
    fill: style === 'hidden' ? 'none' : style === 'section' ? FILL[p.part.species] : '#fffdf8',
  }
  return o.circle ? <circle cx={o.cx} cy={-o.cy!} r={o.r} {...common} /> : <rect x={o.x} y={-(o.y! + o.h!)} width={o.w} height={o.h} {...common} />
}

function DimH({ x1, x2, y, label, fs }: { x1: number; x2: number; y: number; label: string; fs: number }) {
  return (
    <g stroke={INK} strokeWidth={1.4} fill="none">
      <line x1={x1} x2={x2} y1={-y} y2={-y} />
      <line x1={x1} x2={x1} y1={-y - 12} y2={-y + 12} />
      <line x1={x2} x2={x2} y1={-y - 12} y2={-y + 12} />
      <text x={(x1 + x2) / 2} y={-y - 8} fontSize={fs} textAnchor="middle" fill={INK} stroke="none">{label}</text>
    </g>
  )
}

function DimV({ y1, y2, x, label, fs }: { y1: number; y2: number; x: number; label: string; fs: number }) {
  return (
    <g stroke={INK} strokeWidth={1.4} fill="none">
      <line x1={x} x2={x} y1={-y1} y2={-y2} />
      <line x1={x - 12} x2={x + 12} y1={-y1} y2={-y1} />
      <line x1={x - 12} x2={x + 12} y1={-y2} y2={-y2} />
      <text x={x - 10} y={-(y1 + y2) / 2} fontSize={fs} textAnchor="middle" fill={INK} stroke="none" transform={`rotate(-90 ${x - 10} ${-(y1 + y2) / 2})`}>{label}</text>
    </g>
  )
}

function Frame({ title, box, children }: { title: string; box: [number, number, number, number]; children: React.ReactNode }) {
  const [x0, y0, x1, y1] = box
  return (
    <div className="drawing">
      <div className="small"><b>{title}</b></div>
      <svg viewBox={`${x0} ${-y1} ${x1 - x0} ${y1 - y0}`} role="img" aria-label={title}>
        <line x1={x0} x2={x1} y1={0} y2={0} stroke={INK} strokeWidth={1} />
        {children}
      </svg>
    </div>
  )
}

export function Drawings({ params: p }: { params: DeskParams }) {
  const [at, setAt] = useState<'sit' | 'stand'>('sit')
  const g = geometry(p)
  const h = at === 'sit' ? p.sitHeight : g.maxHeight
  const placed = useMemo<Placed[]>(
    () => parts(p).map((part) => {
      const o = offsetAt(p, part, h)
      return { part, c: [part.pos[0] + o[0], part.pos[1] + o[1], part.pos[2] + o[2]] as Vec3 }
    }),
    [p, h],
  )
  const fs = Math.max(p.topLength, h) / 36
  const vis = placed.filter((x) => VISIBLE.has(x.part.kind))
  const hidden = placed.filter((x) => !VISIBLE.has(x.part.kind) && x.part.kind !== 'ballast')
  const columns = placed.filter((x) => x.part.kind === 'column')
  const inner = g.xc - p.pedestalWidth / 2
  const m = fs * 4

  // Section through the left end panel: everything inside it, cut open.
  const left = placed.filter((x) => Math.abs(x.c[0] + g.xc) < p.pedestalWidth / 2 + 1 && !x.part.skin && x.part.kind !== 'top' && x.part.kind !== 'rail')

  return (
    <>
      <Seg label="Show at" value={at} options={[['sit', `sitting ${p.sitHeight / 10} cm`], ['stand', `standing ${g.maxHeight / 10} cm`]]} onChange={setAt} />
      <Frame title="Front view · Vorderansicht" box={[-p.topLength / 2 - m, -m, p.topLength / 2 + m, h + m]}>
        {hidden.map((x) => <Shape key={x.part.id} p={x} a={0} style="hidden" />)}
        {vis.map((x) => <Shape key={x.part.id} p={x} a={0} style="visible" />)}
        {columns.map((x) => {
          const top = x.c[1] + x.part.size[1] / 2
          return top > g.pedTop ? <rect key={x.part.id} x={x.c[0] - x.part.size[0] / 2} y={-top} width={x.part.size[0]} height={top - g.pedTop} fill="#fffdf8" stroke={INK} strokeWidth={2.5} /> : null
        })}
        <DimV y1={0} y2={h} x={-p.topLength / 2 - fs * 1.2} label={`${h}`} fs={fs} />
        <DimH x1={-p.topLength / 2} x2={p.topLength / 2} y={h + fs * 1.4} label={`${p.topLength}`} fs={fs} />
        <DimH x1={-inner} x2={inner} y={g.pedTop * 0.55} label={`knee space ${g.kneeSpace}`} fs={fs} />
        <DimV y1={0} y2={g.pedTop} x={p.topLength / 2 + fs * 1.6} label={`${g.pedTop}`} fs={fs} />
      </Frame>
      <Frame title="Side view · Seitenansicht" box={[-p.pedestalDepth / 2 - m, -m * 1.6, p.pedestalDepth / 2 + m * 1.2, h + m]}>
        {hidden.map((x) => <Shape key={x.part.id} p={x} a={2} style="hidden" />)}
        {vis.filter((x) => x.c[0] < 0).map((x) => <Shape key={x.part.id} p={x} a={2} style="visible" />)}
        <DimH x1={-p.topDepth / 2} x2={p.topDepth / 2} y={h + fs * 1.4} label={`${p.topDepth}`} fs={fs} />
        <DimH x1={-p.pedestalDepth / 2} x2={p.pedestalDepth / 2} y={-fs * 1.6} label={`${p.pedestalDepth}`} fs={fs} />
        <DimH x1={-p.pedestalDepth / 2} x2={p.pedestalDepth / 2} y={g.pedTop * 0.5} label={`${p.pedestalDepth}`} fs={fs} />
        <DimV y1={0} y2={h} x={p.pedestalDepth / 2 + fs * 1.6} label={`${h}`} fs={fs} />
      </Frame>
      <Frame title="Section A–A through the pedestal · Schnitt durch den Korpus" box={[-p.pedestalDepth / 2 - m, -m, p.pedestalDepth / 2 + m * 1.5, Math.max(h, g.pedTop) + m]}>
        {left.map((x) => <Shape key={x.part.id} p={x} a={2} style="section" />)}
        <DimV y1={g.colBottomSit + (h - p.sitHeight)} y2={g.pedTop} x={p.pedestalDepth / 2 + fs * 1.4} label={`guided ${Math.round(g.pedTop - g.colBottomSit - (h - p.sitHeight))}`} fs={fs * 0.8} />
        <text x={0} y={-(g.pedTop + fs)} fontSize={fs * 0.8} textAnchor="middle" fill={INK}>
          travel {g.travel} · weights {Math.round(g.weightTravel)} ({p.tackle}:1) · pulley Ø{C.pulleyD}
        </text>
      </Frame>
      <RackDetail pitch={p.detentPitch} />
    </>
  )
}

function RackDetail({ pitch }: { pitch: number }) {
  const n = 4
  const notch = 10
  const depth = 10
  const hook = Math.tan((5 * Math.PI) / 180) * depth
  const w = C.rack.t
  const H = pitch * n
  let d = `M 0 0 L ${w} 0`
  for (let i = 0; i < n; i++) {
    const y = pitch * (i + 0.5)
    // Lower (load) face slopes down into the rack: a downward load pulls the pawl deeper.
    d += ` L ${w} ${y} L ${w - depth} ${y} L ${w - depth} ${y + notch + hook} L ${w} ${y + notch}`
  }
  d += ` L ${w} ${H} L 0 ${H} Z`
  return (
    <div className="drawing">
      <div className="small"><b>Detail: detent rack, beech · Rastleiste Buche</b> (notches hooked 5° so load pulls the pawl in)</div>
      <svg viewBox={`-40 -10 ${w + 120} ${H + 20}`} style={{ maxWidth: 260 }} role="img" aria-label="Detent rack detail">
        <path d={d} fill={FILL.beech} stroke={INK} strokeWidth={0.8} />
        <g stroke={INK} strokeWidth={0.5}>
          <line x1={w + 12} x2={w + 12} y1={pitch * 0.5} y2={pitch * 1.5} />
          <line x1={w + 8} x2={w + 16} y1={pitch * 0.5} y2={pitch * 0.5} />
          <line x1={w + 8} x2={w + 16} y1={pitch * 1.5} y2={pitch * 1.5} />
        </g>
        <text x={w + 18} y={pitch + 3} fontSize={8} fill={INK}>{pitch} mm</text>
        <text x={w + 18} y={pitch * 2.5 + 3} fontSize={8} fill={INK}>notch {notch} × {depth}</text>
      </svg>
    </div>
  )
}
