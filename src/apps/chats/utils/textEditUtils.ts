import { APP_STORAGE_KEYS } from "@/utils/storage";
import { saveAsMarkdown } from "@/utils/markdown/saveUtils";
import { type TextEditOperation } from "./markupUtils"; // Import from local utils

// Define types for TextEdit content structure
interface TextNode {
  type?: string; // Make type optional as it might not always be present
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  // Using Record instead of any for better type safety
  [key: string]: unknown;
}

interface ContentNode {
  type: string;
  content?: Array<TextNode | ContentNode>;
  attrs?: NodeAttributes;
  [key: string]: unknown;
}

export interface TextEditContent {
  type?: string; // Make type optional
  content?: ContentNode[];
  // Using Record instead of any for better type safety
  [key: string]: unknown;
}

// Define additional types for document formatting
interface FormattingPatterns {
  nodeTypes: Record<string, number>;
  headingLevels: Set<number>;
  hasBulletLists: boolean;
  hasNumberedLists: boolean;
  hasCodeBlocks: boolean;
  codeLanguages: Set<string>;
  hasTaskLists: boolean;
  hasRichTextFormatting: boolean;
}

interface NodeAttributes {
  level?: number;
  language?: string;
  checked?: boolean;
  [key: string]: unknown;
}

// Helper function to extract text from TextEdit JSON content
export const extractTextFromTextEditContent = (content: string): string => {
  try {
    const jsonContent = JSON.parse(content) as TextEditContent;
    if (!jsonContent.content) return "";

    return jsonContent.content
      .map((node: ContentNode) => {
        // Convert different node types to their text representation
        let level: number;
        let language: string;
        let isChecked: boolean | undefined;
        let checkMark: string;

        switch (node.type) {
          case "paragraph":
            return extractTextFromContentNode(node);

          case "heading":
            level = (node.attrs as NodeAttributes)?.level || 1;
            return "#".repeat(level) + " " + extractTextFromContentNode(node);

          case "codeBlock":
            language = (node.attrs as NodeAttributes)?.language || "";
            return (
              "```" +
              language +
              "\n" +
              extractTextFromContentNode(node) +
              "\n```"
            );

          case "horizontalRule":
            return "---";

          case "bulletList":
            if (!node.content) return "";
            return node.content
              .filter((item): item is ContentNode => item && typeof item === 'object' && "type" in item) // Filter to ensure we only have ContentNodes
              .map((item: ContentNode) => {
                // Process each list item
                if (item.type === "listItem" && item.content) {
                  // Get the first paragraph of the list item
                  const paragraph = item.content.find(
                    (n): n is ContentNode =>
                      n && typeof n === 'object' && "type" in n && n.type === "paragraph"
                  );
                  if (paragraph) {
                    return "- " + extractTextFromContentNode(paragraph);
                  }
                }
                return "- ";
              })
              .join("\n");

          case "orderedList":
            if (!node.content) return "";
            return node.content
              .filter((item): item is ContentNode => item && typeof item === 'object' && "type" in item) // Filter to ensure we only have ContentNodes
              .map((item: ContentNode, i: number) => {
                // Process each list item
                if (item.type === "listItem" && item.content) {
                  // Get the first paragraph of the list item
                  const paragraph = item.content.find(
                    (n): n is ContentNode =>
                      n && typeof n === 'object' && "type" in n && n.type === "paragraph"
                  );
                  if (paragraph) {
                    return `${i + 1}. ` + extractTextFromContentNode(paragraph);
                  }
                }
                return `${i + 1}. `;
              })
              .join("\n");

          case "taskList":
          case "taskItem":
            isChecked = (node.attrs as NodeAttributes)?.checked;
            checkMark = isChecked ? "[x]" : "[ ]";

            if (node.type === "taskList" && node.content) {
              return node.content
                .filter((item): item is ContentNode => item && typeof item === 'object' && "type" in item) // Filter to ensure we only have ContentNodes
                .map((item: ContentNode) => {
                  const itemChecked = (item.attrs as NodeAttributes)?.checked;
                  const itemMark = itemChecked ? "[x]" : "[ ]";

                  const paragraph = item.content?.find(
                    (n): n is ContentNode =>
                      n && typeof n === 'object' && "type" in n && n.type === "paragraph"
                  );

                  if (paragraph) {
                    return (
                      "- " +
                      itemMark +
                      " " +
                      extractTextFromContentNode(paragraph)
                    );
                  }
                  return "- " + itemMark + " ";
                })
                .join("\n");
            } else if (node.type === "taskItem" && node.content) {
              const paragraph = node.content.find(
                (n): n is ContentNode => n && typeof n === 'object' && "type" in n && n.type === "paragraph"
              );

              if (paragraph) {
                return (
                  "- " + checkMark + " " + extractTextFromContentNode(paragraph)
                );
              }
              return "- " + checkMark + " ";
            }
            return "";

          case "blockquote":
            if (!node.content) return "";
            return node.content
              .filter((item): item is ContentNode => item && typeof item === 'object' && "type" in item) // Filter to ensure we only have ContentNodes
              .map((n: ContentNode) => "> " + extractTextFromContentNode(n))
              .join("\n");

          default:
            return extractTextFromContentNode(node);
        }
      })
      .join("\n");
  } catch (error) {
    console.error("Error extracting text from TextEdit content:", error);
    // If not valid JSON or other error, return as is
    return content;
  }
};

// Helper function to extract text from a content node
const extractTextFromContentNode = (node: ContentNode): string => {
  if (!node.content) return "";

  return node.content
    .map((textNode: TextNode | ContentNode) => {
      // Handle nested ContentNodes recursively
      if ('type' in textNode && textNode.type !== 'text') {
        return extractTextFromContentNode(textNode as ContentNode);
      }

      // Handle TextNodes
      const actualTextNode = textNode as TextNode;
      let text = actualTextNode.text || "";

      // If this node has marks, add appropriate markdown formatting
      if (
        actualTextNode.marks &&
        Array.isArray(actualTextNode.marks) &&
        actualTextNode.marks.length > 0
      ) {
        actualTextNode.marks.forEach((mark) => {
          switch (mark.type) {
            case "bold":
              text = `**${text}**`;
              break;
            case "italic":
              text = `*${text}*`;
              break;
            case "code":
              text = `\`${text}\``;
              break;
            case "strike":
              text = `~~${text}~~`;
              break;
            case "link":
              if (mark.attrs && mark.attrs.href) {
                text = `[${text}](${mark.attrs.href})`;
              }
              break;
          }
        });
      }

      return text;
    })
    .join("");
};


// Function to apply edits to TextEdit content
export const applyTextEditChanges = (content: string, edits: TextEditOperation[]) => {
  if (!edits.length) return content;

  // Split content into lines for easier processing
  const lines = content.split("\n");
  // console.log(`Document has ${lines.length} lines before applying edits`);

  // Create a copy of edits to avoid modifying the original array
  const editsCopy = [...edits];

  // Sort edits by line number in ascending order to process them sequentially
  editsCopy.sort((a, b) => a.line - b.line);

  // console.log("Processing edits in order:", JSON.stringify(editsCopy, null, 2));

  // Apply each edit and track line number changes
  for (let i = 0; i < editsCopy.length; i++) {
    const edit = editsCopy[i];
    let lineIndex = edit.line - 1; // Convert to 0-indexed, make mutable

    // Track how many lines were added or removed by this edit
    let lineCountChange = 0;

    // Validate line numbers before applying edits
    if (
      edit.type === "insert" &&
      (lineIndex < 0 || lineIndex > lines.length) // Allow inserting at the very end (index == lines.length)
    ) {
      console.warn(
        `Invalid insert line number ${edit.line} (document has ${lines.length} lines)`
      );
      continue;
    } else if (
      (edit.type === "replace" || edit.type === "delete") &&
      (lineIndex < 0 || lineIndex >= lines.length)
    ) {
      console.warn(
        `Invalid ${edit.type} line number ${edit.line} (document has ${lines.length} lines)`
      );
      continue;
    }

    // console.log(`Applying edit #${i + 1}: ${edit.type} at line ${edit.line}`);

    switch (edit.type) {
      case "insert":
        if (edit.content !== undefined) { // Check for undefined instead of just truthy
          const newLines = edit.content.split("\n");
          // console.log(
          //   `Inserting ${newLines.length} line(s) at line ${edit.line} (index ${lineIndex})`
          // );
          // console.log(`Original document has ${lines.length} lines`);

          // Adjust lineIndex if it's beyond the current document length
          if (lineIndex > lines.length) {
            // console.log(
            //   `Adjusting lineIndex from ${lineIndex} to ${lines.length} (end of document)`
            // );
            lineIndex = lines.length;
          }

          // Show what the insertion point looks like
          // if (lineIndex < lines.length) {
          //   console.log(`Inserting before: "${lines[lineIndex]}"`);
          // } else {
          //   console.log(`Inserting at end of document`);
          // }

          // Insert the new lines at the specified index
          lines.splice(lineIndex, 0, ...newLines);

          // Track how many lines were added
          lineCountChange = newLines.length;
          // console.log(`After insert, document now has ${lines.length} lines`);

          // Log a snippet of the document after insertion
          // console.log(
          //   `Document after insert: "${lines
          //     .slice(
          //       Math.max(0, lineIndex - 1),
          //       Math.min(lineIndex + newLines.length + 1, lines.length)
          //     )
          //     .join("\n")}"`
          // );
        } else {
          console.warn(`Insert operation at line ${edit.line} has no content`);
        }
        break;

      case "replace":
        if (edit.content !== undefined) { // Check for undefined
          const count = Math.min(edit.count || 1, lines.length - lineIndex);
          const newLines = edit.content.split("\n");
          // console.log(
          //   `Replacing ${count} line(s) at line ${edit.line} with ${newLines.length} new line(s)`
          // );
          // console.log(`Content to replace with: "${edit.content}"`);
          // console.log(
          //   `Lines being replaced: "${lines
          //     .slice(lineIndex, lineIndex + count)
          //     .join("\n")}"`
          // );

          // Detailed logging of the replacement operation
          // console.log(`Before replace: Document has ${lines.length} lines`);
          // console.log(
          //   `Replace at index ${lineIndex} (line ${edit.line}), count: ${count}`
          // );
          // console.log(`New content has ${newLines.length} lines`);

          // Ensure we're not trying to replace beyond the end of the document
          if (lineIndex >= lines.length) {
            console.warn(
              `Replace operation at line ${edit.line} is beyond end of document (${lines.length} lines)`
            );
            // Adjust to replace the last line instead
            lineIndex = Math.max(0, lines.length - 1);
            // console.log(
            //   `Adjusted replace to operate on line ${lineIndex + 1} instead`
            // );
          }

          // Perform the replacement
          lines.splice(lineIndex, count, ...newLines);

          // Track how many lines were added or removed
          lineCountChange = newLines.length - count;
          // console.log(`Line count change: ${lineCountChange}`);
          // console.log(`After replace: Document now has ${lines.length} lines`);
          // console.log(
          //   `Document content after replace: "${lines
          //     .slice(0, Math.min(5, lines.length))
          //     .join("\n")}${lines.length > 5 ? "..." : ""}"`
          // );
        } else {
          console.warn(`Replace operation at line ${edit.line} has no content`);
        }
        break;

      case "delete":
        {
          const count = Math.min(edit.count || 1, lines.length - lineIndex);
          // console.log(`Deleting ${count} line(s) at line ${edit.line}`);

          lines.splice(lineIndex, count);

          // Track how many lines were removed
          lineCountChange = -count;
          // console.log(`After delete, document now has ${lines.length} lines`);
        }
        break;
    }

    // If we added or removed lines, adjust the line numbers of subsequent edits
    if (lineCountChange !== 0) {
      // console.log(
      //   `Edit at line ${edit.line} changed line count by ${lineCountChange}`
      // );

      // Update line numbers for all subsequent edits
      for (let j = i + 1; j < editsCopy.length; j++) {
        // Only adjust if the edit is AFTER the current edit's line
        // For insertions, this means line numbers greater than the insertion point
        // For replacements and deletions, this means line numbers greater than the last line affected
        const adjustmentThreshold =
          edit.type === "replace" || edit.type === "delete"
            ? edit.line + (edit.count || 1) - 1 // Last line affected by replace/delete
            : edit.line; // Line at which insertion occurred

        if (editsCopy[j].line > adjustmentThreshold) {
          const originalLine = editsCopy[j].line;
          editsCopy[j].line += lineCountChange;
          // console.log(
          //   `Adjusted edit #${j + 1} (${
          //     editsCopy[j].type
          //   }) from line ${originalLine} to new line ${editsCopy[j].line}`
          // );

          // Validate the adjusted line number
          if (editsCopy[j].line <= 0) {
            console.warn(
              `Edit #${j + 1} has invalid line number after adjustment: ${
                editsCopy[j].line
              }, setting to 1`
            );
            editsCopy[j].line = 1;
          } else if (
            editsCopy[j].type !== "insert" &&
            editsCopy[j].line > lines.length
          ) {
            // console.warn(
            //   `Edit #${j + 1} (${editsCopy[j].type}) has line number ${
            //     editsCopy[j].line
            //   } after adjustment, but document only has ${lines.length} lines`
            // );
            // For non-insert operations, we need to ensure the line exists
            if (
              editsCopy[j].type === "replace" ||
              editsCopy[j].type === "delete"
            ) {
              // console.warn(
              //   `Adjusting edit #${j + 1} line number to ${lines.length}`
              // );
              editsCopy[j].line = Math.max(1, lines.length);
            }
          }
        }
      }
    }
  }

  // console.log(`Final document has ${lines.length} lines after all edits`);

  // Join lines back into a single string
  return lines.join("\n");
};


// Function to get the most current TextEdit content as plain text
export const getCurrentTextEditContent = (): string | null => {
  try {
    // Get current content as JSON
    const contentJson = localStorage.getItem(APP_STORAGE_KEYS.textedit.CONTENT);
    if (!contentJson) return null;

    // Extract text content
    return extractTextFromTextEditContent(contentJson);
  } catch (error) {
    console.error("Error getting current TextEdit content:", error);
    return null;
  }
};

// Function to ensure TextEdit document is saved before editing
export const ensureDocumentSaved = async (content: string): Promise<string | null> => {
  // Check if there's a current file path
  const currentFilePath = localStorage.getItem(
    APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
  );

  if (currentFilePath) {
    return currentFilePath; // Document already has a path
  }

  // Create a new document since there's no current path
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `Untitled-${timestamp}.md`;
  const newPath = `/Documents/${fileName}`;

  console.log("Creating new document for unsaved TextEdit content:", newPath);

  // Create a basic document structure from the plain text
  const paragraphs = content.split("\n");
  const jsonContent: TextEditContent = {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: paragraph.trim() ? [{ type: "text", text: paragraph }] : [],
    })),
  };

  // Create save file event with markdown content
  const savePromise = new Promise<boolean>((resolve) => {
    // Create a one-time listener to detect when the file is saved
    const handleSaved = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.path === newPath) {
        window.removeEventListener("fileSaved", handleSaved as EventListener);
        resolve(true);
      }
    };

    window.addEventListener("fileSaved", handleSaved as EventListener);

    // Set a timeout to resolve anyway
    setTimeout(() => {
      window.removeEventListener("fileSaved", handleSaved as EventListener);
      resolve(false); // Indicate timeout/failure
    }, 2000);

    // Use shared utility to save as markdown
    const { jsonContent: savedJsonContent } = saveAsMarkdown(jsonContent, {
      name: fileName,
      path: newPath
    });

    // Update localStorage with JSON content for editor state
    localStorage.setItem(APP_STORAGE_KEYS.textedit.CONTENT, JSON.stringify(savedJsonContent));
    localStorage.setItem(APP_STORAGE_KEYS.textedit.LAST_FILE_PATH, newPath);

    // Also dispatch openAfterSave for TextEdit
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("openFile", {
          detail: {
            path: newPath,
            content: JSON.stringify(savedJsonContent),
            forceReload: true,
          },
        })
      );
    }, 100);
  });

  // Wait for save to complete
  const saved = await savePromise;

  if (saved) {
    console.log("Successfully created new document:", newPath);
    return newPath;
  } else {
    console.error("Failed to create new document (timeout or error)");
    return null;
  }
};


// --- Markdown Parsing Logic (Simplified for TextEdit Integration) ---

// Add a markdown parser function
export const parseMarkdown = (text: string): ContentNode[] => {
  // Simple markdown parsing for common elements
  // This is a basic implementation - you might want to use a more robust markdown parser

  // Process the text line by line
  const lines = text.split("\n");
  const nodes: ContentNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent = "";
  let codeBlockLanguage = "";
  let inBulletList = false;
  let bulletListItems: ContentNode[] = [];
  let inOrderedList = false;
  let orderedListItems: ContentNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for code blocks
    if (trimmedLine.startsWith("```")) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockLanguage = trimmedLine.slice(3).trim();
        codeBlockContent = "";
        continue;
      } else {
        // End of code block
        inCodeBlock = false;
        nodes.push({
          type: "codeBlock",
          attrs: { language: codeBlockLanguage || "text" },
          content: [{ type: "text", text: codeBlockContent }],
        });
        continue;
      }
    }

    // If we're in a code block, add the line to the code block content
    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? "\n" : "") + line;
      continue;
    }

    // Check for task list items
    const taskListMatch = trimmedLine.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (taskListMatch) {
      const isChecked = taskListMatch[1].toLowerCase() === "x";
      const taskText = taskListMatch[2];

      nodes.push({
        type: "taskItem",
        attrs: { checked: isChecked },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: taskText }],
          },
        ],
      });
      continue;
    }

    // Check for bullet list items
    if (trimmedLine.match(/^[-*]\s+(.+)$/)) {
      const bulletContent = trimmedLine.replace(/^[-*]\s+/, "");

      if (!inBulletList) {
        // Start a new bullet list
        inBulletList = true;
        bulletListItems = [];
      }

      // Add this item to the bullet list
      bulletListItems.push({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: processInlineMarkdown(bulletContent),
          },
        ],
      });
      continue;
    } else if (inBulletList) {
      // End of bullet list
      nodes.push({
        type: "bulletList",
        content: bulletListItems,
      });
      inBulletList = false;
      bulletListItems = [];
    }

    // Check for ordered list items
    const orderedListMatch = trimmedLine.match(/^(\d+)[.)]\s+(.+)$/);
    if (orderedListMatch) {
      const itemContent = orderedListMatch[2];

      if (!inOrderedList) {
        // Start a new ordered list
        inOrderedList = true;
        orderedListItems = [];
      }

      // Add this item to the ordered list
      orderedListItems.push({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: processInlineMarkdown(itemContent),
          },
        ],
      });
      continue;
    } else if (inOrderedList) {
      // End of ordered list
      nodes.push({
        type: "orderedList",
        content: orderedListItems,
      });
      inOrderedList = false;
      orderedListItems = [];
    }

    // Check for headings (# Heading)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      nodes.push({
        type: "heading",
        attrs: { level },
        content: processInlineMarkdown(content),
      });
      continue;
    }

    // Check for horizontal rule
    if (trimmedLine.match(/^(\*{3,}|-{3,}|_{3,})$/)) {
      nodes.push({
        type: "horizontalRule",
      });
      continue;
    }

    // Check for blockquotes
    if (trimmedLine.startsWith(">")) {
      const quoteContent = trimmedLine.substring(1).trim();
      nodes.push({
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: processInlineMarkdown(quoteContent),
          },
        ],
      });
      continue;
    }

    // Skip processing if the line is empty
    if (!trimmedLine) {
      nodes.push({
        type: "paragraph",
        content: [],
      });
      continue;
    }

    // Process the line for inline formatting
    const inlineContent = processInlineMarkdown(trimmedLine);

    nodes.push({
      type: "paragraph",
      content:
        inlineContent.length > 0
          ? inlineContent
          : [{ type: "text", text: trimmedLine }],
    });
  }

  // Add any remaining lists
  if (inBulletList && bulletListItems.length > 0) {
    nodes.push({
      type: "bulletList",
      content: bulletListItems,
    });
  }

  if (inOrderedList && orderedListItems.length > 0) {
    nodes.push({
      type: "orderedList",
      content: orderedListItems,
    });
  }

  // If we ended while still in a code block, add it
  if (inCodeBlock) {
    nodes.push({
      type: "codeBlock",
      attrs: { language: codeBlockLanguage || "text" },
      content: [{ type: "text", text: codeBlockContent }],
    });
  }

  return nodes;
};

// Helper function to process inline markdown formatting
export const processInlineMarkdown = (text: string): TextNode[] => {
  const result: TextNode[] = [];

  // Regular expressions for inline formatting
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, mark: "bold" }, // **bold**
    { regex: /\*(.+?)\*/g, mark: "italic" }, // *italic*
    { regex: /_(.+?)_/g, mark: "italic" }, // _italic_
    { regex: /`(.+?)`/g, mark: "code" }, // `code`
    { regex: /~~(.+?)~~/g, mark: "strike" }, // ~~strikethrough~~
    { regex: /\[(.+?)\]\((.+?)\)/g, mark: "link" }, // [text](url)
  ];

  // Find all matches for all patterns
  const allMatches: Array<{
    start: number;
    end: number;
    content: string;
    mark: string;
    url?: string;
  }> = [];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      // For links, we need to store the URL as well
      if (pattern.mark === "link") {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1], // Link text
          mark: pattern.mark,
          url: match[2], // Link URL
        });
      } else {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1],
          mark: pattern.mark,
        });
      }
    }
  });

  // Sort matches by start position
  allMatches.sort((a, b) => a.start - b.start);

  // Check for overlapping matches and remove inner matches
  for (let i = 0; i < allMatches.length - 1; i++) {
    for (let j = i + 1; j < allMatches.length; j++) {
      // Simple overlap check: if j starts before i ends
      if (allMatches[j].start < allMatches[i].end) {
        // More robust check: if j is fully contained within i
        if (allMatches[j].end <= allMatches[i].end) {
          // Remove inner match j
          allMatches.splice(j, 1);
          j--; // Adjust index after removal
        }
        // Handle cases where they partially overlap or i is contained in j if needed
        // For simplicity, this basic check removes fully contained inner matches.
      }
    }
  }


  // Process the text with the non-overlapping matches
  let currentPosition = 0;

  for (const match of allMatches) {
    // Add any text before this match
    if (match.start > currentPosition) {
      result.push({
        type: "text",
        text: text.substring(currentPosition, match.start),
      });
    }

    // Add the formatted text
    if (match.mark === "link") {
      result.push({
        type: "text",
        marks: [{ type: "link", attrs: { href: match.url } }],
        text: match.content,
      });
    } else {
      result.push({
        type: "text",
        marks: [{ type: match.mark }],
        text: match.content,
      });
    }

    currentPosition = match.end;
  }

  // Add any remaining text
  if (currentPosition < text.length) {
    result.push({
      type: "text",
      text: text.substring(currentPosition),
    });
  }

  // If the result is empty but the original text wasn't, return the original text as a single node
  if (result.length === 0 && text.length > 0) {
      return [{ type: "text", text: text }];
  }

  return result;
};

// Function to update TextEdit content in localStorage
export const updateTextEditContent = (newContent: string): boolean => {
  try {
    // Get current content as JSON
    const contentJson = localStorage.getItem(APP_STORAGE_KEYS.textedit.CONTENT);
    if (!contentJson) {
        console.warn("No existing TextEdit content found in localStorage.");
        return false;
    }

    // Get the current file path
    const currentFilePath = localStorage.getItem(
      APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
    );
    if (!currentFilePath) {
        console.warn("No last file path found for TextEdit.");
        return false;
    }

    // Parse the JSON content
    let jsonContent: TextEditContent;
    try {
        jsonContent = JSON.parse(contentJson);
    } catch (parseError) {
        console.error("Failed to parse existing TextEdit JSON content:", parseError);
        return false;
    }

    // Analyze original structure to preserve formatting patterns
    const formattingPatterns = analyzeDocumentFormatting(jsonContent);
    // console.log("Detected formatting patterns:", formattingPatterns);

    // Parse markdown content into document nodes, preserving formatting
    const markdownNodes = parseMarkdownWithFormattingPreservation(
      newContent,
      formattingPatterns
    );

    // Create a deep clone of the original structure to preserve properties
    const updatedContent: TextEditContent = {
      ...jsonContent, // Keep top-level properties like 'type'
      content: markdownNodes,
    };

    // Get the filename from the path
    const fileName = currentFilePath.split("/").pop() || "Untitled";

    // Use our shared utility to save the file (this also updates localStorage)
    const { jsonContent: savedJsonContent } = saveAsMarkdown(updatedContent, {
      name: fileName,
      path: currentFilePath
    });

    // Update localStorage with the updated JSON content (redundant if saveAsMarkdown does it, but safe)
    const jsonString = JSON.stringify(savedJsonContent);
    localStorage.setItem(APP_STORAGE_KEYS.textedit.CONTENT, jsonString);

    // Dispatch events to notify TextEdit app of changes
    window.dispatchEvent(
      new CustomEvent("contentChanged", {
        detail: {
          path: currentFilePath,
          content: jsonString,
        },
      })
    );

    window.dispatchEvent(
      new CustomEvent("documentUpdated", {
        detail: {
          path: currentFilePath,
          content: jsonString,
        },
      })
    );

    // For full refresh, try to reopen the document
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("openFile", {
          detail: {
            path: currentFilePath,
            content: jsonString,
            forceReload: true,
          },
        })
      );

      // Also try direct editor update
      window.dispatchEvent(
        new CustomEvent("updateEditorContent", {
          detail: {
            path: currentFilePath,
            content: jsonString,
          },
        })
      );
    }, 100);

    return true;
  } catch (error) {
    console.error("Error updating TextEdit content:", error);
  }
  return false;
};


// Function to analyze document structure for formatting patterns
export const analyzeDocumentFormatting = (
  document: TextEditContent
): FormattingPatterns => {
  const patterns: FormattingPatterns = {
    nodeTypes: {},
    headingLevels: new Set<number>(),
    hasBulletLists: false,
    hasNumberedLists: false,
    hasCodeBlocks: false,
    codeLanguages: new Set<string>(),
    hasTaskLists: false,
    hasRichTextFormatting: false,
  };

  if (!document.content) return patterns;

  const traverse = (nodes: Array<ContentNode | TextNode>) => {
    nodes.forEach((node) => {
      if (!node || typeof node !== 'object') return;

      // Handle ContentNodes
      if ('type' in node && typeof node.type === 'string') {
        const contentNode = node as ContentNode;
        patterns.nodeTypes[contentNode.type] = (patterns.nodeTypes[contentNode.type] || 0) + 1;

        const attrs = (contentNode.attrs as NodeAttributes) || {};

        if (contentNode.type === "heading" && attrs.level) {
          patterns.headingLevels.add(attrs.level);
        }
        if (contentNode.type === "bulletList") patterns.hasBulletLists = true;
        if (contentNode.type === "orderedList") patterns.hasNumberedLists = true;
        if (contentNode.type === "codeBlock" && attrs.language) {
          patterns.hasCodeBlocks = true;
          patterns.codeLanguages.add(attrs.language);
        }
        if (contentNode.type === "taskList" || contentNode.type === "taskItem") {
          patterns.hasTaskLists = true;
        }

        // Recursively traverse children if they exist
        if (contentNode.content) {
          traverse(contentNode.content);
        }
      }
      // Handle TextNodes
      else if ('text' in node) {
        const textNode = node as TextNode;
        if (
          textNode.marks &&
          Array.isArray(textNode.marks) &&
          textNode.marks.length > 0
        ) {
          patterns.hasRichTextFormatting = true;
        }
      }
    });
  };

  traverse(document.content);

  return patterns;
};

// Enhanced markdown parser that preserves formatting based on document analysis
export const parseMarkdownWithFormattingPreservation = (
  text: string,
  formattingPatterns: FormattingPatterns
): ContentNode[] => {
  // Start with the basic markdown parser
  const baseNodes = parseMarkdown(text);

  // Now enhance the nodes based on detected formatting patterns
  const enhancedNodes = baseNodes.map((node) => {
    // Apply formatting enhancements based on node type
    if (node.type === "paragraph" && formattingPatterns.hasRichTextFormatting) {
      // For paragraphs, we want to enhance with rich text if the original had it
      return enhanceParagraphWithRichText(node);
    }

    // Other node types can have specific enhancements added here

    return node;
  });

  // Add any special node types that might be missing from basic markdown parsing
  if (
    formattingPatterns.hasTaskLists &&
    !enhancedNodes.some((n) => n.type === "taskList" || n.type === "taskItem")
  ) {
    // Look for potential task list items in paragraphs and convert them
    convertPotentialTaskListItems(enhancedNodes);
  }

  return enhancedNodes;
};

// Helper function to enhance paragraphs with rich text formatting
const enhanceParagraphWithRichText = (node: ContentNode): ContentNode => {
  // If node already has rich text formatting, leave it as is
  if (
    node.content?.some(
      (c) => c.marks && Array.isArray(c.marks) && c.marks.length > 0
    )
  ) {
    return node;
  }

  // Otherwise, try to detect and apply common markdown patterns within the paragraph text
  if (
    node.content &&
    node.content.length === 1 &&
    node.content[0].type === "text" && // Ensure it's a text node
    typeof node.content[0].text === "string"
  ) {
    const text = node.content[0].text;
    const inlineContent = processInlineMarkdown(text);

    if (
      inlineContent.length > 1 ||
      (inlineContent.length === 1 && inlineContent[0].marks)
    ) {
      // We detected some inline formatting, apply it
      return {
        ...node,
        content: inlineContent,
      };
    }
  }

  return node;
};

// Helper function to detect and convert potential task list items
const convertPotentialTaskListItems = (nodes: ContentNode[]): void => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (
      node.type === "paragraph" &&
      node.content &&
      node.content.length === 1
    ) {
      const textNode = node.content[0] as TextNode;
      const text = textNode.text || "";

      // Check for common task list patterns like "- [ ] Task" or "- [x] Completed task"
      if (typeof text === "string") {
        const taskListRegex = /^[-*]\s+\[([\sx])\]\s+(.+)$/;
        const match = text.match(taskListRegex);

        if (match) {
          const isChecked = match[1].toLowerCase() === "x";
          const taskText = match[2];

          // Replace the paragraph with a task item
          nodes[i] = {
            type: "taskItem",
            attrs: { checked: isChecked },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: taskText }],
              },
            ],
          };
        }
      }
    }
  }
};