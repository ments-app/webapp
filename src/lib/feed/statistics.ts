/**
 * Statistical tests for A/B experiment analysis.
 */

/**
 * Z-test for proportions (e.g., CTR, engagement rate).
 * Returns z-statistic, p-value, and confidence interval.
 */
export function zTestProportions(
  successes1: number,
  total1: number,
  successes2: number,
  total2: number
): { z: number; pValue: number; ciLower: number; ciUpper: number; isSignificant: boolean } {
  const p1 = total1 > 0 ? successes1 / total1 : 0;
  const p2 = total2 > 0 ? successes2 / total2 : 0;
  const pPooled = (successes1 + successes2) / (total1 + total2);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / total1 + 1 / total2));

  if (se === 0) {
    return { z: 0, pValue: 1, ciLower: 0, ciUpper: 0, isSignificant: false };
  }

  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const diff = p1 - p2;
  const seDiff = Math.sqrt((p1 * (1 - p1)) / total1 + (p2 * (1 - p2)) / total2);
  const ciLower = diff - 1.96 * seDiff;
  const ciUpper = diff + 1.96 * seDiff;

  return {
    z,
    pValue,
    ciLower,
    ciUpper,
    isSignificant: pValue < 0.05,
  };
}

/**
 * Welch's t-test for means (e.g., avg dwell time, feed depth).
 */
export function welchTTest(
  mean1: number,
  var1: number,
  n1: number,
  mean2: number,
  var2: number,
  n2: number
): { t: number; pValue: number; ciLower: number; ciUpper: number; isSignificant: boolean } {
  if (n1 < 2 || n2 < 2) {
    return { t: 0, pValue: 1, ciLower: 0, ciUpper: 0, isSignificant: false };
  }

  const se = Math.sqrt(var1 / n1 + var2 / n2);
  if (se === 0) {
    return { t: 0, pValue: 1, ciLower: 0, ciUpper: 0, isSignificant: false };
  }

  const t = (mean1 - mean2) / se;

  // Welch–Satterthwaite degrees of freedom
  const num = (var1 / n1 + var2 / n2) ** 2;
  const den = (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1);
  const df = num / den;

  // Approximate p-value using normal distribution for large df
  const pValue = df > 30 ? 2 * (1 - normalCDF(Math.abs(t))) : approximateTTestPValue(Math.abs(t), df);

  const diff = mean1 - mean2;
  const ciLower = diff - 1.96 * se;
  const ciUpper = diff + 1.96 * se;

  return {
    t,
    pValue,
    ciLower,
    ciUpper,
    isSignificant: pValue < 0.05,
  };
}

/**
 * Compute confidence interval for a proportion.
 */
export function proportionCI(
  successes: number,
  total: number,
  confidenceLevel: number = 0.95
): { value: number; lower: number; upper: number } {
  if (total === 0) return { value: 0, lower: 0, upper: 0 };

  const p = successes / total;
  const z = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;
  const se = Math.sqrt((p * (1 - p)) / total);

  return {
    value: p,
    lower: Math.max(0, p - z * se),
    upper: Math.min(1, p + z * se),
  };
}

/**
 * Compute relative change between two values.
 */
export function relativeChange(baseline: number, variant: number): number {
  if (baseline === 0) return 0;
  return (variant - baseline) / baseline;
}

// Standard normal CDF approximation
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Approximate t-test p-value for smaller df
function approximateTTestPValue(t: number, df: number): number {
  // Simple approximation: use normal for df > 30, otherwise use a conservative estimate
  if (df > 30) return 2 * (1 - normalCDF(t));
  // For smaller df, the t-distribution has heavier tails
  const adjustment = 1 + (t * t) / (4 * df);
  return Math.min(1, 2 * (1 - normalCDF(t / Math.sqrt(adjustment))));
}
