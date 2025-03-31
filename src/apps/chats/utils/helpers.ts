// Helper function to truncate filename
export const truncateFilename = (filename: string, maxLength: number = 20): string => {
  if (filename.length <= maxLength) return filename;

  // Get file extension
  const lastDotIndex = filename.lastIndexOf(".");
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : "";

  // Calculate how much of the name we can keep
  const nameLength = maxLength - extension.length - 3; // 3 for the ellipsis

  if (nameLength <= 0) {
    // If the extension is too long, just truncate the whole thing
    return filename.slice(0, maxLength - 3) + "...";
  }

  // Truncate the name part but keep the extension
  const namePart = filename.slice(
    0,
    lastDotIndex !== -1 ? lastDotIndex : filename.length
  );
  return namePart.slice(0, nameLength) + "..." + extension;
};

// Add a helper function to generate unique IDs (similar to what the server uses)
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};