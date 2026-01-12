// Helper: Smart rounding to nearest 0.5 or 1
export function smartRound(value) {
  const whole = Math.floor(value);
  const decimal = value - whole;

  if (decimal >= 0.75) {
    return whole + 1;
  } else if (decimal >= 0.25) {
    return whole + 0.5;
  } else {
    return whole;
  }
}

// Helper: Calculate hydration percentage based on liquid type
export function getHydrationPercentage(liquidType) {
  if (!liquidType) return 1.0;
  const type = liquidType.toLowerCase().trim();

  if (
    type.includes("water") ||
    type.includes("sparkling") ||
    type.includes("seltzer")
  )
    return 1.0;

  if ((type.includes("diet") || type.includes("zero")) && type.includes("soda"))
    return 0.9;

  if (type.includes("soda") || type.includes("coke") || type.includes("pepsi"))
    return 0.75;

  if (type.includes("gatorade") || type.includes("powerade")) return 0.7;
  if (type.includes("energy") || type.includes("red bull")) return 0.65;
  if (type.includes("coffee") || type.includes("tea")) return 0.8;
  if (type.includes("milk") || type.includes("dairy")) return 0.75;
  if (type.includes("juice")) return 0.7;
  if (type.includes("smoothie") || type.includes("protein")) return 0.65;
  if (
    type.includes("beer") ||
    type.includes("wine") ||
    type.includes("alcohol")
  )
    return 0.0;

  return 1.0;
}
