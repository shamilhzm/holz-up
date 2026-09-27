const round5 = (mm: number) => Math.round(mm / 5) * 5

/**
 * Starting-point desk heights from body height (anthropometric rules of thumb:
 * seated work surface ≈ 0.41 × stature; standing elbow height ≈ 0.63 × stature,
 * keyboard surface ~4 cm below it). Always verify with a stack of books.
 */
export function suggestedHeights(bodyHeightMm: number): { sit: number; stand: number } {
  return { sit: round5(0.41 * bodyHeightMm), stand: round5(0.63 * bodyHeightMm - 40) }
}
