export type SandInputs = {
  totalXP: number
  publishedTools: number
  fulfilledBounties: number
  claimedBounties: number
  badgeCount: number
}

export function calculateSandBreakdown(inputs: SandInputs) {
  const breakdown = [
    { label: 'Starter balance', credits: 1000 },
    { label: 'XP momentum', credits: Math.floor(inputs.totalXP / 5) },
    { label: 'Published tools', credits: inputs.publishedTools * 250 },
    { label: 'Claimed collaborations', credits: inputs.claimedBounties * 75 },
    { label: 'Fulfilled bounties', credits: inputs.fulfilledBounties * 300 },
    { label: 'Earned badges', credits: inputs.badgeCount * 40 },
  ]

  return breakdown.filter(item => item.credits > 0)
}

export function calculateSandBalance(inputs: SandInputs) {
  return calculateSandBreakdown(inputs).reduce((sum, item) => sum + item.credits, 0)
}
