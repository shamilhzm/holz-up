/** The claude.ai artifact viewer blocks printing and downloads; the normal build allows both. */
const artifact = import.meta.env.VITE_TARGET === 'artifact'
export const CAN_PRINT = !artifact
export const CAN_DOWNLOAD = !artifact
