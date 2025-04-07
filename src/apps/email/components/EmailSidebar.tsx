import { Label, Thread } from "./EmailAppComponent";

interface EmailSidebarProps {
  labels: Label[];
  selectedLabelId: string | null;
  onLabelSelect: (labelId: string | null) => void;
  onCompose: () => void;
  threads: Thread[];
}

export function EmailSidebar({
  labels,
  selectedLabelId,
  onLabelSelect,
  onCompose,
  threads,
}: EmailSidebarProps) {
  // Count unread emails for each label
  const getUnreadCount = (labelId: string | null) => {
    if (labelId === null) {
      // Count all unread threads
      return threads.filter(thread => thread.unread).length;
    }
    // Count unread threads with specific label
    return threads.filter(thread => thread.unread && thread.labels.includes(labelId)).length;
  };

  return (
    <div className="w-48 h-full bg-gray-100 border-r border-gray-200 flex flex-col overflow-auto">
      <button
        onClick={onCompose}
        className="m-2 p-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600 transition-colors"
      >
        Compose
      </button>

      <div className="p-2">
        <button
          onClick={() => onLabelSelect(null)}
          className={`w-full text-left px-3 py-1.5 rounded text-sm mb-1 flex justify-between items-center ${
            selectedLabelId === null
              ? "bg-blue-100 text-blue-800 font-semibold"
              : "hover:bg-gray-200"
          }`}
        >
          <span>Inbox</span>
          {getUnreadCount(null) > 0 && (
            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {getUnreadCount(null)}
            </span>
          )}
        </button>

        <button
          onClick={() => onLabelSelect("starred")}
          className={`w-full text-left px-3 py-1.5 rounded text-sm mb-1 flex justify-between items-center ${
            selectedLabelId === "starred"
              ? "bg-blue-100 text-blue-800 font-semibold"
              : "hover:bg-gray-200"
          }`}
        >
          <span>Starred</span>
          <span className="text-yellow-500">★</span>
        </button>
      </div>

      <div className="p-2 border-t border-gray-200">
        <div className="text-xs font-semibold text-gray-500 px-3 py-1">
          LABELS
        </div>
        {labels.map((label) => (
          <button
            key={label.id}
            onClick={() => onLabelSelect(label.id)}
            className={`w-full text-left px-3 py-1.5 rounded text-sm mb-1 flex justify-between items-center ${
              selectedLabelId === label.id
                ? "bg-blue-100 text-blue-800 font-semibold"
                : "hover:bg-gray-200"
            }`}
          >
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: label.color }}
              ></div>
              <span>{label.name}</span>
            </div>
            {getUnreadCount(label.id) > 0 && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {getUnreadCount(label.id)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
