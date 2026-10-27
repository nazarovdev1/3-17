export interface StillCreditsManifest {
  credit?: { author: string; sourceUrl: string; license: string }
  frames: Record<string, unknown>
}
const marker = '\n## Mobile scene renders\n'
/** Both asset builders emit the same attribution for every rendered color/depth pair. */
export function withStillCredits(base: string, manifest: StillCreditsManifest): string {
  const previous = base.split(marker)[0]!.trimEnd()
  const credit = manifest.credit
  if (!credit) return `${previous}\n`
  const rows = Object.keys(manifest.frames)
    .sort()
    .map(
      (id) =>
        `| ${id} | still + depth | ${credit.author} | [Render pipeline](${credit.sourceUrl}) | ${credit.license} |`,
    )
  return [
    previous,
    '',
    '## Mobile scene renders',
    '',
    'Original rendered compositions of the world above. The credited source models/materials retain their licenses and attribution; all renders include those sources.',
    '',
    '| Asset | Type | Author | Source | License |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}
