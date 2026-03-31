export type DirectionalState = 'bullish' | 'bearish' | 'neutral'
export type MacroBiasLabel =
  | 'Strong Risk On'
  | 'Mild Risk On'
  | 'Mixed'
  | 'Mild Risk Off'
  | 'Strong Risk Off'

export interface MacroBiasInputs {
  us02y?: number | null
  us10y?: number | null
  dxy?: number | null
  spx?: number | null
  nas100?: number | null
  btc?: number | null
  xauusd?: number | null
  eurusd?: number | null
}

export interface MacroBiasFactorStates {
  yields: 'up' | 'down' | 'neutral'
  dollar: 'strong' | 'weak' | 'neutral'
  equities: 'strong' | 'weak' | 'neutral'
  crypto: 'strong' | 'weak' | 'neutral'
  gold: 'strong' | 'weak' | 'neutral'
  euro: 'strong' | 'weak' | 'neutral'
}

export interface MacroBiasResult {
  score: number
  label: MacroBiasLabel
  confidence: number
  explanation: string
  factorStates: MacroBiasFactorStates
}

type AssetKey = keyof MacroBiasInputs
type FactorKey = keyof MacroBiasFactorStates

interface BiasContext {
  inputs: MacroBiasInputs
  assetStates: Record<AssetKey, DirectionalState>
  factorStates: MacroBiasFactorStates
  composites: Record<FactorKey, number>
}

interface RuleHit {
  id: string
  weight: number
  summary: string
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const round = (value: number, digits = 1) => {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

// Thresholds define when a daily move is meaningful enough to count as a state.
// Keep these near the top so tuning the engine is just editing constants.
export const STATE_THRESHOLDS = {
  yields: 0.12,
  dollar: 0.15,
  equities: 0.35,
  crypto: 1.0,
  gold: 0.35,
  euro: 0.18,
} as const

// Group weights control which inputs matter more inside each factor.
// 2Y > 10Y for policy; Nasdaq > SPX for growth/risk appetite.
export const FACTOR_GROUP_WEIGHTS = {
  yields: { us02y: 0.62, us10y: 0.38 },
  equities: { nas100: 0.6, spx: 0.4 },
  dollar: { dxy: 0.65, eurusdInverse: 0.35 },
} as const

// Baseline factor contribution to the final bias score.
// Yields stay intentionally small here because their meaning is contextual.
export const BASE_FACTOR_WEIGHTS = {
  equities: 2.8,
  dollar: 1.9,
  crypto: 1.1,
  gold: 0.9,
  euro: 0.7,
  yields: 0.2,
} as const

// Formula bonuses/penalties. These are the expandable core of the engine.
export const RULE_WEIGHTS = {
  easingRiskOn: 3.2,
  growthScare: -3.5,
  tighteningRiskOff: -3.0,
  techCryptoConfirmation: 1.8,
  goldDefensive: -1.5,
  euroDollarTailwind: 1.2,
  fearBid: -2.2,
  altSafetyBid: -1.4,
  btcDivergence: -0.8,
  softLandingRelief: 1.2,
} as const

export const LABEL_THRESHOLDS = {
  strongRiskOn: 6.5,
  mildRiskOn: 2.25,
  mildRiskOff: -2.25,
  strongRiskOff: -6.5,
} as const

function toDirectionalState(change: number | null | undefined, threshold: number): DirectionalState {
  if (change == null || Number.isNaN(change)) return 'neutral'
  if (change > threshold) return 'bullish'
  if (change < -threshold) return 'bearish'
  return 'neutral'
}

function stateValue(state: DirectionalState): number {
  if (state === 'bullish') return 1
  if (state === 'bearish') return -1
  return 0
}

function weightedComposite(entries: Array<{ value: number; weight: number }>): number {
  const usable = entries.filter(entry => entry.weight > 0)
  if (!usable.length) return 0

  const totalWeight = usable.reduce((sum, entry) => sum + entry.weight, 0)
  const weighted = usable.reduce((sum, entry) => sum + entry.value * entry.weight, 0)

  return totalWeight > 0 ? weighted / totalWeight : 0
}

function classifyDirectional(composite: number): DirectionalState {
  if (composite > 0.25) return 'bullish'
  if (composite < -0.25) return 'bearish'
  return 'neutral'
}

function buildFactorStates(composites: Record<FactorKey, number>): MacroBiasFactorStates {
  const yieldsState = classifyDirectional(composites.yields)
  const dollarState = classifyDirectional(composites.dollar)
  const equitiesState = classifyDirectional(composites.equities)
  const cryptoState = classifyDirectional(composites.crypto)
  const goldState = classifyDirectional(composites.gold)
  const euroState = classifyDirectional(composites.euro)

  return {
    yields: yieldsState === 'bullish' ? 'up' : yieldsState === 'bearish' ? 'down' : 'neutral',
    dollar: dollarState === 'bullish' ? 'strong' : dollarState === 'bearish' ? 'weak' : 'neutral',
    equities: equitiesState === 'bullish' ? 'strong' : equitiesState === 'bearish' ? 'weak' : 'neutral',
    crypto: cryptoState === 'bullish' ? 'strong' : cryptoState === 'bearish' ? 'weak' : 'neutral',
    gold: goldState === 'bullish' ? 'strong' : goldState === 'bearish' ? 'weak' : 'neutral',
    euro: euroState === 'bullish' ? 'strong' : euroState === 'bearish' ? 'weak' : 'neutral',
  }
}

function evaluateRules(context: BiasContext): RuleHit[] {
  const { factorStates } = context
  const hits: RuleHit[] = []

  if (factorStates.yields === 'down' && factorStates.equities === 'strong' && factorStates.dollar === 'weak') {
    hits.push({
      id: 'easing-risk-on',
      weight: RULE_WEIGHTS.easingRiskOn,
      summary: 'Falling yields, firm equities, and a softer dollar point to easing-led risk appetite.',
    })
  }

  if (factorStates.yields === 'down' && factorStates.equities === 'weak' && factorStates.dollar === 'strong') {
    hits.push({
      id: 'growth-scare',
      weight: RULE_WEIGHTS.growthScare,
      summary: 'Yields are falling, but weak equities and a firm dollar lean growth-scare and defensive positioning.',
    })
  }

  if (factorStates.yields === 'up' && factorStates.equities === 'weak' && factorStates.dollar === 'strong') {
    hits.push({
      id: 'tightening-risk-off',
      weight: RULE_WEIGHTS.tighteningRiskOff,
      summary: 'Higher yields, weaker equities, and a firm dollar suggest tightening or inflation pressure.',
    })
  }

  if (factorStates.equities === 'strong' && factorStates.crypto === 'strong' && factorStates.dollar !== 'strong') {
    hits.push({
      id: 'tech-crypto-confirmation',
      weight: RULE_WEIGHTS.techCryptoConfirmation,
      summary: 'Nasdaq-led equities are being confirmed by BTC, which strengthens the risk-on read.',
    })
  }

  if (factorStates.gold === 'strong' && factorStates.equities === 'weak') {
    hits.push({
      id: 'gold-defensive',
      weight: RULE_WEIGHTS.goldDefensive,
      summary: 'Gold strength alongside weak equities adds a defensive tilt.',
    })
  }

  if (factorStates.euro === 'strong' && factorStates.dollar === 'weak' && factorStates.equities !== 'weak') {
    hits.push({
      id: 'euro-dollar-tailwind',
      weight: RULE_WEIGHTS.euroDollarTailwind,
      summary: 'EURUSD strength and a softer dollar keep cross-asset conditions supportive.',
    })
  }

  if (factorStates.gold === 'strong' && factorStates.dollar === 'strong' && factorStates.equities === 'weak') {
    hits.push({
      id: 'fear-bid',
      weight: RULE_WEIGHTS.fearBid,
      summary: 'Gold and the dollar are both bid while equities struggle, which is a classic fear mix.',
    })
  }

  if (
    factorStates.gold === 'strong' &&
    factorStates.euro === 'strong' &&
    factorStates.dollar === 'weak' &&
    factorStates.equities !== 'strong'
  ) {
    hits.push({
      id: 'alt-safety-bid',
      weight: RULE_WEIGHTS.altSafetyBid,
      summary: 'Gold and the euro are rising as the dollar softens, hinting at alternative safety demand rather than clean risk appetite.',
    })
  }

  if (factorStates.crypto === 'weak' && factorStates.equities !== 'weak') {
    hits.push({
      id: 'btc-divergence',
      weight: RULE_WEIGHTS.btcDivergence,
      summary: 'BTC is not confirming the equity tape, which trims confidence in risk-on.',
    })
  }

  if (factorStates.yields === 'down' && factorStates.equities === 'strong' && factorStates.dollar === 'neutral') {
    hits.push({
      id: 'soft-landing-relief',
      weight: RULE_WEIGHTS.softLandingRelief,
      summary: 'Lower yields with resilient equities look more like relief than recession stress.',
    })
  }

  return hits
}

function buildExplanation(score: number, confidence: number, hits: RuleHit[], factorStates: MacroBiasFactorStates, missingInputs: number) {
  const positiveHits = hits
    .filter(hit => hit.weight > 0)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
  const negativeHits = hits
    .filter(hit => hit.weight < 0)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))

  let explanation = ''

  if (score >= LABEL_THRESHOLDS.mildRiskOn) {
    const leading = positiveHits.slice(0, 2).map(hit => hit.summary)
    explanation = leading.length
      ? leading.join(' ')
      : 'Equities, crypto, and the dollar mix lean supportive enough to keep the bias risk-on.'

    if (negativeHits.length) {
      explanation += ' Some defensive cross-currents remain, so conviction is not full.'
    }
  } else if (score <= LABEL_THRESHOLDS.mildRiskOff) {
    const leading = negativeHits.slice(0, 2).map(hit => hit.summary)
    explanation = leading.length
      ? leading.join(' ')
      : 'Cross-asset positioning leans defensive, with equities and dollar/yield signals not confirming a clean risk bid.'

    if (positiveHits.length) {
      explanation += ' A few offsetting signals are keeping the move from becoming a full washout.'
    }
  } else {
    const pos = positiveHits[0]?.summary
    const neg = negativeHits[0]?.summary

    if (pos && neg) {
      explanation = `${pos} ${neg} That leaves the overall tape mixed.`
    } else if (pos || neg) {
      explanation = `${pos ?? neg} Other inputs are not confirming strongly enough yet, so the bias stays mixed.`
    } else {
      explanation = 'The major cross-asset inputs are balanced enough that the tape still reads mixed.'
    }
  }

  if (confidence < 0.5) {
    explanation += ' Signals are conflicting, so confidence stays low.'
  } else if (confidence > 0.8) {
    explanation += ' Multiple formulas are lining up in the same direction.'
  }

  if (missingInputs > 2) {
    explanation += ' Some market inputs are missing, so the read is lighter than usual.'
  }

  if (!hits.length) {
    if (factorStates.yields === 'down' && factorStates.equities === 'weak') {
      explanation += ' Falling yields are not being treated as bullish because stocks are not confirming.'
    } else if (factorStates.yields === 'down' && factorStates.equities === 'strong') {
      explanation += ' Falling yields are being treated as supportive because stocks are absorbing them well.'
    }
  }

  return explanation.trim()
}

export function getMacroBias(inputs: MacroBiasInputs): MacroBiasResult {
  const assetStates: Record<AssetKey, DirectionalState> = {
    us02y: toDirectionalState(inputs.us02y, STATE_THRESHOLDS.yields),
    us10y: toDirectionalState(inputs.us10y, STATE_THRESHOLDS.yields),
    dxy: toDirectionalState(inputs.dxy, STATE_THRESHOLDS.dollar),
    spx: toDirectionalState(inputs.spx, STATE_THRESHOLDS.equities),
    nas100: toDirectionalState(inputs.nas100, STATE_THRESHOLDS.equities),
    btc: toDirectionalState(inputs.btc, STATE_THRESHOLDS.crypto),
    xauusd: toDirectionalState(inputs.xauusd, STATE_THRESHOLDS.gold),
    eurusd: toDirectionalState(inputs.eurusd, STATE_THRESHOLDS.euro),
  }

  const composites: Record<FactorKey, number> = {
    yields: weightedComposite([
      { value: stateValue(assetStates.us02y), weight: FACTOR_GROUP_WEIGHTS.yields.us02y },
      { value: stateValue(assetStates.us10y), weight: FACTOR_GROUP_WEIGHTS.yields.us10y },
    ]),
    dollar: weightedComposite([
      { value: stateValue(assetStates.dxy), weight: FACTOR_GROUP_WEIGHTS.dollar.dxy },
      { value: -stateValue(assetStates.eurusd), weight: FACTOR_GROUP_WEIGHTS.dollar.eurusdInverse },
    ]),
    equities: weightedComposite([
      { value: stateValue(assetStates.nas100), weight: FACTOR_GROUP_WEIGHTS.equities.nas100 },
      { value: stateValue(assetStates.spx), weight: FACTOR_GROUP_WEIGHTS.equities.spx },
    ]),
    crypto: stateValue(assetStates.btc),
    gold: stateValue(assetStates.xauusd),
    euro: stateValue(assetStates.eurusd),
  }

  const factorStates = buildFactorStates(composites)
  const context: BiasContext = { inputs, assetStates, factorStates, composites }
  const hits = evaluateRules(context)

  const baseScore =
    composites.equities * BASE_FACTOR_WEIGHTS.equities +
    -composites.dollar * BASE_FACTOR_WEIGHTS.dollar +
    composites.crypto * BASE_FACTOR_WEIGHTS.crypto +
    -composites.gold * BASE_FACTOR_WEIGHTS.gold +
    composites.euro * BASE_FACTOR_WEIGHTS.euro +
    -composites.yields * BASE_FACTOR_WEIGHTS.yields

  const ruleScore = hits.reduce((sum, hit) => sum + hit.weight, 0)
  const rawScore = clamp(baseScore + ruleScore, -10, 10)

  const riskSignals = [
    Math.sign(composites.equities),
    Math.sign(-composites.dollar),
    Math.sign(composites.crypto),
    Math.sign(-composites.gold),
    Math.sign(composites.euro),
  ].filter(value => value !== 0)

  const positiveSignals = riskSignals.filter(value => value > 0).length
  const negativeSignals = riskSignals.filter(value => value < 0).length
  const conflictRatio = riskSignals.length
    ? Math.min(positiveSignals, negativeSignals) / riskSignals.length
    : 0.5

  const sameSideRuleMagnitude = hits
    .filter(hit => Math.sign(hit.weight) === Math.sign(rawScore))
    .reduce((sum, hit) => sum + Math.abs(hit.weight), 0)
  const totalRuleMagnitude = hits.reduce((sum, hit) => sum + Math.abs(hit.weight), 0)
  const ruleAlignment = totalRuleMagnitude > 0 ? sameSideRuleMagnitude / totalRuleMagnitude : 0.5
  const coverage = Math.min(1, (hits.length + riskSignals.length) / 8)
  const conviction = Math.min(1, Math.abs(rawScore) / 7)

  let confidence = 0.34 + ruleAlignment * 0.24 + coverage * 0.16 + conviction * 0.18 - conflictRatio * 0.24
  if (hits.length >= 3 && conflictRatio < 0.15) confidence += 0.05

  const missingInputs = Object.values(inputs).filter(value => value == null || Number.isNaN(value)).length
  if (missingInputs > 0) confidence -= Math.min(0.12, missingInputs * 0.02)

  confidence = clamp(confidence, 0.28, 0.95)

  // Conflict should pull the public-facing score back toward mixed.
  const score = round(clamp(rawScore * (0.62 + confidence * 0.38), -10, 10), 1)
  const classificationScore = score

  let label: MacroBiasLabel = 'Mixed'
  if (classificationScore >= LABEL_THRESHOLDS.strongRiskOn) label = 'Strong Risk On'
  else if (classificationScore >= LABEL_THRESHOLDS.mildRiskOn) label = 'Mild Risk On'
  else if (classificationScore <= LABEL_THRESHOLDS.strongRiskOff) label = 'Strong Risk Off'
  else if (classificationScore <= LABEL_THRESHOLDS.mildRiskOff) label = 'Mild Risk Off'

  const explanation = buildExplanation(score, confidence, hits, factorStates, missingInputs)

  return {
    score,
    label,
    confidence: round(confidence, 2),
    explanation,
    factorStates,
  }
}
