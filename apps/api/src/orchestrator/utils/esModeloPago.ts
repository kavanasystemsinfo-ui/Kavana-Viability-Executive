/**
 * Determines if a model is paid or free based on known model names.
 * This is a simplified implementation - in a real system, this might
 * come from a configuration file or database.
 */
export function esModeloPago(modelName: string): boolean {
  // List of known free models (as of the time of writing)
  const freeModels = [
    'google/gemini-flash-1.5',
    'google/gemini-pro',
    'gemini-pro',
    'gemini-flash-1.5',
    // Add other free models as needed
  ];

  // Check if the model is in the free list
  const isFree = freeModels.some((freeModel) =>
    modelName.toLowerCase().includes(freeModel.toLowerCase()),
  );

  // If it's in the free list, it's not paid
  return !isFree;
}
