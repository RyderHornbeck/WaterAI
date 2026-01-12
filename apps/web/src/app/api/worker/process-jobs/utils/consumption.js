// Calculate consumed ounces based on duration
export function calculateDurationBasedConsumption(duration, sipSize) {
  const seconds = parseInt(duration.split(" ")[0], 10);
  const sipRates = { small: 0.4, medium: 0.6, large: 0.85 };
  const ozPerSecond = sipRates[sipSize] || sipRates.medium;
  return seconds * ozPerSecond;
}

// Calculate consumed ounces based on percentage
export function calculatePercentageBasedConsumption(
  containerOunces,
  percentage,
) {
  return (containerOunces * percentage) / 100;
}

// Calculate final ounces with servings and hydration multiplier
export function calculateFinalOunces(
  consumedOunces,
  servings,
  hydrationMultiplier,
) {
  const servingsCount = servings || 1;
  const totalOunces = consumedOunces * servingsCount;
  const adjustedOunces = totalOunces * hydrationMultiplier;
  return adjustedOunces;
}

// Validate and clamp ounces to reasonable range
export function validateOunces(ounces) {
  const rounded = Math.round(ounces * 2) / 2;
  return Math.max(0.5, Math.min(rounded, 128));
}
