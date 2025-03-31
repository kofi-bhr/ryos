import { type AppId } from "@/config/appRegistry";

// Define types for app control markup
export interface AppControlOperation {
  type: "launch" | "close";
  id: string;
}

// Helper function to parse app control markup
export const parseAppControlMarkup = (message: string): AppControlOperation[] => {
  const operations: AppControlOperation[] = [];

  try {
    // Find all app control tags
    const launchRegex = /<app:launch\s+id\s*=\s*"([^"]+)"\s*\/>/g;
    const closeRegex = /<app:close\s+id\s*=\s*"([^"]+)"\s*\/>/g;

    // Find all launch operations
    let match;
    while ((match = launchRegex.exec(message)) !== null) {
      operations.push({
        type: "launch",
        id: match[1],
      });
    }

    // Find all close operations
    while ((match = closeRegex.exec(message)) !== null) {
      operations.push({
        type: "close",
        id: match[1],
      });
    }
  } catch (error) {
    console.error("Error parsing app control markup:", error);
  }

  return operations;
};

// Helper function to clean app control markup from message
export const cleanAppControlMarkup = (message: string): string => {
  // Replace launch tags with human readable text
  message = message.replace(
    /<app:launch\s+id\s*=\s*"([^"]+)"\s*\/>/g,
    (_match, id) => `*opened ${id}*`
  );

  // Replace close tags with human readable text
  message = message.replace(
    /<app:close\s+id\s*=\s*"([^"]+)"\s*\/>/g,
    (_match, id) => `*closed ${id}*`
  );

  return message.trim();
};


// Define the type for text edit operations
export type TextEditOperation = {
  type: "insert" | "replace" | "delete";
  line: number;
  count?: number;
  content?: string;
};

// Function to parse TextEdit XML markup in chat messages
export const parseTextEditMarkup = (message: string): TextEditOperation[] => {
  const edits: TextEditOperation[] = [];

  try {
    // Trim message to ensure clean parsing
    if (!message || typeof message !== "string") {
      console.warn("Invalid message format for parsing");
      return edits;
    }

    const trimmedMessage = message.trim();

    // Log the original message for debugging
    // console.log(
    //   "Parsing TextEdit markup from message:",
    //   trimmedMessage.substring(0, 100) + "..."
    // );

    // First, check if we have equal number of opening and closing tags
    const openingInsertTags = (
      trimmedMessage.match(/<textedit:insert[^>]*>/g) || []
    ).length;
    const closingInsertTags = (
      trimmedMessage.match(/<\/textedit:insert>/g) || []
    ).length;
    const selfClosingDeleteTags = (
      trimmedMessage.match(/<textedit:delete[^>]*\/>/g) || []
    ).length;
    const openingReplaceTags = (
      trimmedMessage.match(/<textedit:replace[^>]*>/g) || []
    ).length;
    const closingReplaceTags = (
      trimmedMessage.match(/<\/textedit:replace>/g) || []
    ).length;

    // console.log(`Tag check:
    //   - Insert: ${openingInsertTags} opening, ${closingInsertTags} closing
    //   - Replace: ${openingReplaceTags} opening, ${closingReplaceTags} closing
    //   - Delete: ${selfClosingDeleteTags} self-closing`);

    if (
      openingInsertTags !== closingInsertTags ||
      openingReplaceTags !== closingReplaceTags
    ) {
      // console.warn("Unbalanced XML tags detected, may get incomplete results");
      // Allow parsing even if unbalanced, might be streaming
    }

    // Regular expressions to match the XML tags - more robust with whitespace handling
    const insertRegex =
      /<textedit:insert\s+line\s*=\s*"(\d+)"\s*>([\s\S]*?)<\/textedit:insert>/g;
    const replaceRegex =
      /<textedit:replace\s+line\s*=\s*"(\d+)"(?:\s+count\s*=\s*"(\d+)")?\s*>([\s\S]*?)<\/textedit:replace>/g;
    const deleteRegex =
      /<textedit:delete\s+line\s*=\s*"(\d+)"(?:\s+count\s*=\s*"(\d+)")?\s*\/>/g;

    // Reset the lastIndex property for all regex patterns
    insertRegex.lastIndex = 0;
    replaceRegex.lastIndex = 0;
    deleteRegex.lastIndex = 0;

    // Find all insertions
    const allInsertions = Array.from(trimmedMessage.matchAll(insertRegex))
      .map((match) => {
        const lineNumber = parseInt(match[1], 10);
        return {
          type: "insert" as const,
          line: lineNumber,
          content: match[2],
        };
      })
      .filter((edit) => edit.line > 0);

    // Find all replacements
    const allReplacements = Array.from(trimmedMessage.matchAll(replaceRegex))
      .map((match) => {
        const lineNumber = parseInt(match[1], 10);
        const count = match[2] ? parseInt(match[2], 10) : 1;
        return {
          type: "replace" as const,
          line: lineNumber,
          count: count,
          content: match[3],
        };
      })
      .filter((edit) => edit.line > 0 && (edit.count || 1) > 0);

    // Find all deletions
    const allDeletions = Array.from(trimmedMessage.matchAll(deleteRegex))
      .map((match) => {
        const lineNumber = parseInt(match[1], 10);
        const count = match[2] ? parseInt(match[2], 10) : 1;
        return {
          type: "delete" as const,
          line: lineNumber,
          count: count,
        };
      })
      .filter((edit) => edit.line > 0 && (edit.count || 1) > 0);

    // Add all edits to the result array
    edits.push(...allInsertions, ...allReplacements, ...allDeletions);

    // console.log(`Successfully parsed:
    //   - ${allInsertions.length} insertions
    //   - ${allReplacements.length} replacements
    //   - ${allDeletions.length} deletions`);

    // Log the edits for debugging
    // if (edits.length > 0) {
    //   console.log(
    //     "Detected TextEdit markup edits:",
    //     JSON.stringify(edits, null, 2)
    //   );
    // } else {
    //   console.warn("No valid edits found despite matching regex patterns");
    // }
  } catch (error) {
    console.error("Error parsing TextEdit markup:", error);
  }

  return edits;
};


// Function to clean XML markup from a message
export const cleanTextEditMarkup = (message: string) => {
  const editDescriptions: string[] = [];

  // Parse the edits to get more detailed information
  const edits = parseTextEditMarkup(message);

  // Group edits by type for better summarization
  const insertions = edits.filter((edit) => edit.type === "insert");
  const replacements = edits.filter((edit) => edit.type === "replace");
  const deletions = edits.filter((edit) => edit.type === "delete");

  // Create human-readable descriptions
  if (insertions.length > 0) {
    const lines = insertions.map((edit) => `line ${edit.line}`).join(", ");
    editDescriptions.push(`*inserted at ${lines}*`);
  }

  if (replacements.length > 0) {
    const lines = replacements
      .map((edit) => {
        const count =
          edit.count && edit.count > 1
            ? ` to ${edit.line + edit.count - 1}`
            : "";
        return `line ${edit.line}${count}`;
      })
      .join(", ");
    editDescriptions.push(`*replaced ${lines}*`);
  }

  if (deletions.length > 0) {
    const lines = deletions
      .map((edit) => {
        const count =
          edit.count && edit.count > 1
            ? ` to ${edit.line + edit.count - 1}`
            : "";
        return `line ${edit.line}${count}`;
      })
      .join(", ");
    editDescriptions.push(`*deleted ${lines}*`);
  }

  // Combine all descriptions
  const cleanedMessage =
    editDescriptions.length > 0 ? editDescriptions.join(", ") : "";

  // Also remove the raw XML tags if no description was generated
  if (!cleanedMessage) {
     return message
       .replace(/<textedit:insert[^>]*>[\s\S]*?<\/textedit:insert>/g, "")
       .replace(/<textedit:replace[^>]*>[\s\S]*?<\/textedit:replace>/g, "")
       .replace(/<textedit:delete[^>]*\/>/g, "")
       .trim();
  }

  return cleanedMessage;
};