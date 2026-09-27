/**
 * With frameloop="demand" the first frame after an idle spell reports the whole idle time as its
 * delta. Cap it so animations ease in from where they are instead of snapping to their end.
 */
export const frameDt = (dt: number) => Math.min(dt, 1 / 20)
