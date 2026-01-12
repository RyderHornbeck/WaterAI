/**
 * Unit conversion and formatting helpers
 * Handles conversion between oz and liters based on user preference
 */

// Conversion constants with higher precision:
// 1 oz = 29.5735295625 mL = 0.0295735295625 L (exact)
// 1 L = 33.8140227018 oz (exact)
const OZ_TO_LITERS = 0.0295735295625;
const LITERS_TO_OZ = 33.8140227018;

/**
 * Convert ounces to liters
 */
export function ozToLiters(oz) {
  return parseFloat(oz) * OZ_TO_LITERS;
}

/**
 * Convert liters to ounces
 */
export function litersToOz(liters) {
  return parseFloat(liters) * LITERS_TO_OZ;
}

/**
 * Format water amount based on user's unit preference
 * @param {number} ounces - Amount in ounces (always stored in DB as oz)
 * @param {string} userUnit - User's preferred unit ("oz" or "liters")
 * @param {boolean} includeUnit - Whether to include the unit label
 * @returns {string} Formatted string like "16 oz" or "0.5 L"
 */
export function formatWaterAmount(
  ounces,
  userUnit = "oz",
  includeUnit = false,
) {
  const oz = parseFloat(ounces);

  if (userUnit === "liters") {
    const liters = ozToLiters(oz);

    // Round to 1 decimal place for cleaner display (e.g., 6.3 L not 6.30 L)
    // This matches common user input patterns for liter goals
    const rounded = Math.round(liters * 10) / 10;
    const formatted = rounded.toFixed(1);

    return includeUnit ? `${formatted} L` : formatted;
  } else {
    // For oz, round to 2 decimal places for consistency
    const rounded = Math.round(oz * 100) / 100;
    const formatted =
      rounded % 1 === 0 ? Math.round(rounded).toString() : rounded.toFixed(2);
    return includeUnit ? `${formatted} oz` : formatted;
  }
}

/**
 * Get the unit label based on user preference
 */
export function getUnitLabel(userUnit = "oz") {
  return userUnit === "liters" ? "L" : "oz";
}

/**
 * Smart rounding for manual entry
 * - For oz: rounds to nearest 0.5
 * - For liters: rounds to 2 decimal places
 */
export function smartRoundInput(value, userUnit = "oz") {
  const num = parseFloat(value);

  if (isNaN(num)) return 0;

  if (userUnit === "liters") {
    // Round to 2 decimal places for liters
    return Math.round(num * 100) / 100;
  } else {
    // Round to nearest 0.5 for oz
    const whole = Math.floor(num);
    const decimal = num - whole;

    if (decimal >= 0.75) {
      return whole + 1;
    } else if (decimal >= 0.25) {
      return whole + 0.5;
    } else {
      return whole;
    }
  }
}

/**
 * Convert user input to ounces for storage
 * If user has liters selected, convert their input to oz
 */
export function convertInputToOz(inputValue, userUnit = "oz") {
  const value = parseFloat(inputValue);

  if (isNaN(value)) return 0;

  if (userUnit === "liters") {
    return litersToOz(value);
  } else {
    return value;
  }
}
