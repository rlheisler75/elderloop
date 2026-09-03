// Scales a recipe's ingredient quantities from its written yield to an
// actual needed serving count — e.g. Cook's Count's resolved headcount for
// that item on a given day. Same "compute once, reuse everywhere" pattern
// as mealResolution.js and malnutritionAlerts.js.

export function scaleIngredients(ingredients, yieldServings, targetServings) {
  if (!yieldServings || yieldServings <= 0 || !targetServings) return null
  const factor = targetServings / yieldServings
  return (ingredients || []).map(ing => ({
    ...ing,
    scaledQuantity: +(ing.quantity * factor).toFixed(2),
  }))
}
