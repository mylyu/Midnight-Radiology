import { CH3 } from './ch3'
import { CH4 } from './ch4'
import { CH5 } from './ch5'
import type { TrilogyId } from './trilogy-types'

export const TRILOGY = { ch3: CH3, ch4: CH4, ch5: CH5 }
export const getTrilogy = (id: TrilogyId) => TRILOGY[id]
