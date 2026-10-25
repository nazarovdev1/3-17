import type { Story, StoryNode } from '@/core/engine/types'
import { night1Nodes } from './night1'
import { night2Nodes } from './night2'
import { night3Nodes } from './night3'
import { night4Nodes } from './night4'
import { night5Nodes } from './night5'

function toRecord(nodes: StoryNode[]): Record<string, StoryNode> {
  const record: Record<string, StoryNode> = {}
  for (const node of nodes) record[node.id] = node
  return record
}

const allNodes = [...night1Nodes, ...night2Nodes, ...night3Nodes, ...night4Nodes, ...night5Nodes]

export const story: Story = {
  start: 'n1_start',
  nodes: toRecord(allNodes),
}
