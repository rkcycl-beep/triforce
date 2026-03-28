/**
 * Age Grade Score (AGS) calculator
 * Based on WMA 2023 tables for running.
 * Returns a percentage (e.g. 72.4 = 72.4% age grade — elite is ~90%+)
 */

const WORLD_RECORD_PACE_SEC_PER_KM: Record<string, number> = {
  RUN: 168,
  RIDE: 60,
  SWIM: 58,
}

const WMA_FACTORS_RUN_MALE: [number, number][] = [
  [20, 1.000], [25, 1.000], [30, 1.000], [35, 0.9753], [40, 0.9474],
  [45, 0.9148], [50, 0.8773], [55, 0.8350], [60, 0.7876], [65, 0.7353],
  [70, 0.6780], [75, 0.6157], [80, 0.5485], [85, 0.4793], [90, 0.4100],
]

const WMA_FACTORS_RUN_FEMALE: [number, number][] = [
  [20, 1.000], [25, 1.000], [30, 1.000], [35, 0.9715], [40, 0.9416],
  [45, 0.9083], [50, 0.8724], [55, 0.8317], [60, 0.7872], [65, 0.7385],
  [70, 0.6858], [75, 0.6291], [80, 0.5703], [85, 0.5093], [90, 0.4483],
]

function getAgeFactor(age: number, gender: string): number {
  const table = gender === 'F' ? WMA_FACTORS_RUN_FEMALE : WMA_FACTORS_RUN_MALE
  for (let i = 0; i < table.length - 1; i++) {
    const [ageA, factorA] = table[i]
    const [ageB, factorB] = table[i + 1]
    if (age >= ageA && age <= ageB) {
      const t = (age - ageA) / (ageB - ageA)
      return factorA + t * (factorB - factorA)
    }
  }
  return table[table.length - 1][1]
}

function getAgeFromDob(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export interface AGSParams {
  sport: string
  distanceM: number
  durationS: number
  dateOfBirth: Date
  gender: string
}

export function calculateAGS(params: AGSParams): number {
  const { sport, distanceM, durationS, dateOfBirth, gender } = params
  if (distanceM <= 0 || durationS <= 0) return 0
  const age = getAgeFromDob(dateOfBirth)
  const actualPaceSecPerKm = durationS / (distanceM / 1000)
  const wrPace = WORLD_RECORD_PACE_SEC_PER_KM[sport] ?? WORLD_RECORD_PACE_SEC_PER_KM['RUN']
  const ageFactor = sport === 'RUN' ? getAgeFactor(age, gender) : 1.0
  const ageAdjustedWRPace = wrPace / ageFactor
  const ags = (ageAdjustedWRPace / actualPaceSecPerKm) * 100
  return Math.min(Math.round(ags * 10) / 10, 100)
}
