import type { Sequence } from '@/core/director/types'
import { night1 } from './n1'
import { night2 } from './n2'
import { night3 } from './n3'
import { night4 } from './n4'
import { night5 } from './n5'
import { endingA, endingB, endingC } from './endings'

/** Every night and ending the Director can run, by sequence id. */
export const SEQUENCES: Record<string, Sequence> = {
  n1: night1,
  n2: night2,
  n3: night3,
  n4: night4,
  n5: night5,
  endA: endingA,
  endB: endingB,
  endC: endingC,
}

export { READABLES } from './readables'
export { ENDING_C } from './n5'
