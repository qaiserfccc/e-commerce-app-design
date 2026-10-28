export type DeliveryRule = { minSubtotal: string; maxSubtotal: string | null; fee: string }

export type DeliverySettings = {
  deliveryFee: string
  freeShippingThreshold: string
  isConfigured: boolean
}

const moneyPattern = /^(\d{1,10})(?:\.(\d{1,2}))?$/
const maxMoneyCents = 999_999_999_999

export function moneyToCents(value: unknown) {
  if (typeof value !== 'string') return null
  const match = moneyPattern.exec(value.trim())
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents <= maxMoneyCents ? cents : null
}

export function moneyFromCents(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

export function parseDeliveryRules(value: unknown): DeliveryRule[] {
  if (!Array.isArray(value)) throw new Error('Saved delivery pricing is invalid.')
  if (value.length > 30) throw new Error('Saved delivery pricing has too many rules.')

  const rules = value.map((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error('Saved delivery pricing is invalid.')
    }
    const rule = entry as Record<string, unknown>
    const minSubtotal = typeof rule.minSubtotal === 'string' ? rule.minSubtotal : ''
    const maxSubtotal = rule.maxSubtotal === null || rule.maxSubtotal === undefined
      ? null
      : typeof rule.maxSubtotal === 'string'
        ? rule.maxSubtotal
        : ''
    const fee = typeof rule.fee === 'string' ? rule.fee : ''
    const minimumCents = moneyToCents(minSubtotal)
    const maximumCents = maxSubtotal === null ? null : moneyToCents(maxSubtotal)
    if (
      minimumCents === null ||
      (maxSubtotal !== null && maximumCents === null) ||
      moneyToCents(fee) === null ||
      (maximumCents !== null && maximumCents < minimumCents)
    ) {
      throw new Error('Saved delivery pricing is invalid.')
    }
    return { minSubtotal, maxSubtotal, fee }
  })

  const orderedRules = [...rules].sort((left, right) => (moneyToCents(left.minSubtotal) ?? 0) - (moneyToCents(right.minSubtotal) ?? 0))
  for (let index = 1; index < orderedRules.length; index += 1) {
    const previousMaximum = orderedRules[index - 1].maxSubtotal === null
      ? null
      : moneyToCents(orderedRules[index - 1].maxSubtotal)
    const nextMinimum = moneyToCents(orderedRules[index].minSubtotal)
    if (previousMaximum === null || nextMinimum === null || nextMinimum <= previousMaximum) {
      throw new Error('Saved delivery pricing rules overlap.')
    }
  }

  return rules
}

export function getDeliveryFeeCents(rules: DeliveryRule[], subtotalCents: number) {
  const rule = rules.find((item) => {
    const minimumCents = moneyToCents(item.minSubtotal)
    const maximumCents = item.maxSubtotal === null ? null : moneyToCents(item.maxSubtotal)
    return minimumCents !== null &&
      subtotalCents >= minimumCents &&
      (maximumCents === null || (maximumCents !== null && subtotalCents <= maximumCents))
  })
  return rule ? moneyToCents(rule.fee) : null
}

export function getFreeShippingThreshold(rules: DeliveryRule[]) {
  const standardFee = getDeliveryFeeCents(rules, 0)
  if (standardFee === null || standardFee === 0) return null
  const threshold = rules
    .filter((rule) => {
      const minimumCents = moneyToCents(rule.minSubtotal)
      return minimumCents !== null && minimumCents > 0 && moneyToCents(rule.fee) === 0
    })
    .map((rule) => moneyToCents(rule.minSubtotal))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right)[0]
  return threshold === undefined ? null : moneyFromCents(threshold)
}

export function deliverySettingsFromRules(rules: DeliveryRule[]): DeliverySettings {
  const feeCents = getDeliveryFeeCents(rules, 0)
  return {
    deliveryFee: feeCents === null ? '' : moneyFromCents(feeCents),
    freeShippingThreshold: getFreeShippingThreshold(rules) ?? '',
    isConfigured: feeCents !== null,
  }
}

export function buildDeliveryRules(deliveryFee: unknown, freeShippingThreshold: unknown): DeliveryRule[] {
  if (typeof deliveryFee !== 'string' || typeof freeShippingThreshold !== 'string') {
    throw new Error('Delivery pricing values are invalid.')
  }
  const feeCents = moneyToCents(deliveryFee)
  if (feeCents === null) throw new Error('Enter a valid delivery price.')

  const thresholdText = freeShippingThreshold.trim()
  if (!thresholdText) {
    return [{ minSubtotal: '0.00', maxSubtotal: null, fee: moneyFromCents(feeCents) }]
  }

  const thresholdCents = moneyToCents(thresholdText)
  if (thresholdCents === null) throw new Error('Enter a valid free-delivery order value.')
  if (thresholdCents === 0) throw new Error('Free-delivery order value must be greater than zero.')
  return [
    { minSubtotal: '0.00', maxSubtotal: moneyFromCents(thresholdCents - 1), fee: moneyFromCents(feeCents) },
    { minSubtotal: moneyFromCents(thresholdCents), maxSubtotal: null, fee: '0.00' },
  ]
}

export function getDeliveryAnnouncement(rules: DeliveryRule[]) {
  const baseFee = getDeliveryFeeCents(rules, 0)
  if (baseFee === null) return null

  const threshold = getFreeShippingThreshold(rules)
  if (threshold) {
    return `Free delivery on orders of ${formatDeliveryPrice(threshold)} or more`
  }
  if (baseFee === 0) return 'Free delivery on all orders'
  return `Delivery ${formatDeliveryPrice(moneyFromCents(baseFee))}`
}

export function formatDeliveryPrice(value: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `Rs ${value}`
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 2,
  }).format(amount)
}
