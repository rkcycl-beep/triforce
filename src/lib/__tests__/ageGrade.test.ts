import { calculateAGS } from '../ageGrade'

describe('calculateAGS', () => {
  const dob35 = new Date(new Date().getFullYear() - 35, 0, 1)
  const dob55 = new Date(new Date().getFullYear() - 55, 0, 1)

  it('returns 0 for zero distance', () => {
    expect(calculateAGS({ sport: 'RUN', distanceM: 0, durationS: 1800, dateOfBirth: dob35, gender: 'M' })).toBe(0)
  })

  it('returns a score between 0 and 100', () => {
    const score = calculateAGS({ sport: 'RUN', distanceM: 10000, durationS: 2700, dateOfBirth: dob35, gender: 'M' })
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('older athlete scores higher than younger for same absolute pace', () => {
    const params = { sport: 'RUN', distanceM: 10000, durationS: 3000 }
    const score35M = calculateAGS({ ...params, dateOfBirth: dob35, gender: 'M' })
    const score55M = calculateAGS({ ...params, dateOfBirth: dob55, gender: 'M' })
    expect(score55M).toBeGreaterThan(score35M)
  })

  it('faster pace gives higher score', () => {
    const base = { sport: 'RUN', distanceM: 10000, dateOfBirth: dob35, gender: 'M' }
    const fast = calculateAGS({ ...base, durationS: 2400 })
    const slow = calculateAGS({ ...base, durationS: 3600 })
    expect(fast).toBeGreaterThan(slow)
  })
})
