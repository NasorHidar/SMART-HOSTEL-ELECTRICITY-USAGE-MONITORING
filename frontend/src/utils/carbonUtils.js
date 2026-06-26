/**
 * src/utils/carbonUtils.js
 *
 * Reusable utility functions for carbon footprint calculations
 * and environmental equivalents.
 *
 * Bangladesh Grid Emission Factor: 0.67 kg CO₂/kWh
 */

export const EMISSION_FACTOR = 0.67; // kg CO₂ per kWh

// ─── Core Conversion ──────────────────────────────────────────────────────────

/** Convert kWh to kg CO₂ */
export const toCO2 = (kwh, factor = EMISSION_FACTOR) =>
  parseFloat((kwh * factor).toFixed(4));

/** Convert kg CO₂ to kWh */
export const toKWh = (co2, factor = EMISSION_FACTOR) =>
  parseFloat((co2 / factor).toFixed(4));

// ─── Environmental Equivalents ────────────────────────────────────────────────

/** CO₂ → km driven in an average car (0.21 kg CO₂/km) */
export const toCarKm = (co2Kg) =>
  parseFloat((co2Kg / 0.21).toFixed(1));

/** CO₂ → liters of gasoline burned (1L ≈ 2.31 kg CO₂) */
export const toGasoline = (co2Kg) =>
  parseFloat((co2Kg / 2.31).toFixed(2));

/** CO₂ → number of smartphone charges (1 charge ≈ 8g = 0.008 kg CO₂) */
export const toSmartphones = (co2Kg) =>
  Math.round(co2Kg / 0.008);

/** CO₂ → hours running a ceiling fan (60W fan × 0.67 factor ≈ 0.04 kg CO₂/h) */
export const toFanHours = (co2Kg) =>
  Math.round(co2Kg / 0.04);

/** CO₂ → trees needed for one year to absorb (1 tree ≈ 21 kg CO₂/year) */
export const toTreesYear = (co2Kg) =>
  parseFloat((co2Kg / 21).toFixed(2));

/** CO₂ → tree-months needed (1 tree absorbs 1.75 kg/month) */
export const toTreeMonths = (co2Kg) =>
  parseFloat((co2Kg / 1.75).toFixed(2));

// ─── Sustainability Score ─────────────────────────────────────────────────────

/**
 * Compute eco-score from monthly kWh.
 * Thresholds calibrated for a single hostel room.
 * Returns { score, label, tier, color, bgColor, borderColor }
 */
export const getSustainabilityScore = (monthlyKWh) => {
  let score, label, tier, color, bgColor, borderColor, emoji;

  if (monthlyKWh <= 30) {
    score       = Math.min(100, Math.round(90 + (10 * (1 - monthlyKWh / 30))));
    label       = 'Excellent';
    tier        = 'excellent';
    color       = '#22c55e';
    bgColor     = 'rgba(34,197,94,0.1)';
    borderColor = 'rgba(34,197,94,0.3)';
    emoji       = '🌿';
  } else if (monthlyKWh <= 60) {
    score       = Math.round(70 + (19 * (1 - (monthlyKWh - 30) / 30)));
    label       = 'Good';
    tier        = 'good';
    color       = '#10b981';
    bgColor     = 'rgba(16,185,129,0.1)';
    borderColor = 'rgba(16,185,129,0.3)';
    emoji       = '👍';
  } else if (monthlyKWh <= 100) {
    score       = Math.round(50 + (19 * (1 - (monthlyKWh - 60) / 40)));
    label       = 'Moderate';
    tier        = 'moderate';
    color       = '#f59e0b';
    bgColor     = 'rgba(245,158,11,0.1)';
    borderColor = 'rgba(245,158,11,0.3)';
    emoji       = '⚠️';
  } else {
    score       = Math.max(0, Math.round(49 * (1 - (monthlyKWh - 100) / 200)));
    label       = 'High Consumption';
    tier        = 'high';
    color       = '#ef4444';
    bgColor     = 'rgba(239,68,68,0.1)';
    borderColor = 'rgba(239,68,68,0.3)';
    emoji       = '🔴';
  }

  return {
    score:       Math.max(0, Math.min(100, score)),
    label,
    tier,
    color,
    bgColor,
    borderColor,
    emoji,
  };
};

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/** Format a CO₂ value with appropriate decimal places */
export const formatCO2 = (kg, decimals = 2) =>
  kg != null ? parseFloat(kg).toFixed(decimals) : '—';

/** Return a relative label for percentage change */
export const changeLabel = (percent) => {
  if (percent === 0) return 'No change';
  return percent > 0 ? `▼ ${Math.abs(percent)}% reduction` : `▲ ${Math.abs(percent)}% increase`;
};
