import { useState } from "react";
import { EmailData } from "./EmailAppComponent";

interface EmailDataEditorProps {
  emailData: EmailData;
  onSave: (data: EmailData) => void;
  onCancel: () => void;
}

export function EmailDataEditor({
  emailData,
  onSave,
  onCancel,
}: EmailDataEditorProps) {
  const [jsonData, setJsonData] = useState<string>(
    JSON.stringify(emailData, null, 2)
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsedData = JSON.parse(jsonData);
      
      // Basic validation to ensure the data structure is correct
      if (!parsedData.emails || !Array.isArray(parsedData.emails)) {
        throw new Error("Invalid data: 'emails' must be an array");
      }
      
      if (!parsedData.threads || !Array.isArray(parsedData.threads)) {
        throw new Error("Invalid data: 'threads' must be an array");
      }
      
      if (!parsedData.labels || !Array.isArray(parsedData.labels)) {
        throw new Error("Invalid data: 'labels' must be an array");
      }
      
      if (!parsedData.user || typeof parsedData.user !== 'object') {
        throw new Error("Invalid data: 'user' must be an object");
      }
      
      setError(null);
      onSave(parsedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON format");
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Edit Email Data</h2>
        <p className="text-sm text-gray-500">
          You can directly edit the JSON data for all emails, threads, labels, and user settings.
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="flex-1 mb-4">
        <textarea
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          className="w-full h-full min-h-[300px] px-3 py-2 border border-gray-300 rounded text-sm font-mono resize-none"
          spellCheck={false}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
