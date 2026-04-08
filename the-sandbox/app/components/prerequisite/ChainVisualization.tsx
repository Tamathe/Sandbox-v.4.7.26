'use client'

import PrerequisiteNodeCard from './PrerequisiteNodeCard'

interface PrerequisiteNodeData {
  concept: string
  effectiveMastery: number
  isStale: boolean
  isGap: boolean
  depth: number
  courseId?: string
  courseCode?: string
}

interface ChainVisualizationProps {
  chain: PrerequisiteNodeData[]
  targetConcept: string
  targetMastery: number
  rootGapConcept?: string
}

export default function ChainVisualization({
  chain,
  targetConcept,
  targetMastery,
  rootGapConcept,
}: ChainVisualizationProps) {
  // Sort by depth descending so deepest prerequisite (root) is at top
  const sorted = [...chain].sort((a, b) => b.depth - a.depth)

  const targetNode: PrerequisiteNodeData = {
    concept: targetConcept,
    effectiveMastery: targetMastery,
    isStale: false,
    isGap: targetMastery < 0.5,
    depth: 0,
  }

  return (
    <div className="flex flex-col items-center">
      {sorted.map((node, i) => (
        <div key={`${node.concept}-${node.depth}`} className="w-full">
          <PrerequisiteNodeCard
            node={node}
            isRootGap={node.concept === rootGapConcept}
          />
          {/* Vertical connector */}
          {(i < sorted.length - 1 || true) && (
            <div className="flex justify-center">
              <div className="h-6 w-0.5 bg-gray-300" />
            </div>
          )}
        </div>
      ))}
      {/* Target concept at the bottom */}
      <div className="w-full">
        <PrerequisiteNodeCard
          node={targetNode}
          isRootGap={false}
          isTarget
        />
      </div>
    </div>
  )
}
