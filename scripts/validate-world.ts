// npm run validate:world — FIX_PROMPT §4.3; also regenerates docs/floorplan.svg.
import { validateWorld } from '../src/core/validate/world'
import './world/floorplan'

const { errors, report } = validateWorld()
for (const line of report) console.log(`  ${line}`)
if (errors.length > 0) {
  for (const e of errors) console.error(`ERROR: ${e}`)
  console.error(`validate:world: FAILED with ${errors.length} error(s)`)
  process.exit(1)
}
console.log('validate:world: OK')
