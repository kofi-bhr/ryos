import { Thread, Email, Label } from "./EmailAppComponent";

interface EmailListProps {
  threads: Thread[];
  emails: Email[];
  labels: Label[];
  onThreadSelect: (threadId: string) => void;
  onToggleStar: (threadId: string) => void;
}

export function EmailList({
  threads,
  emails,
  labels,
  onThreadSelect,
  onToggleStar,
}: EmailListProps) {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get first email in thread
  const getFirstEmail = (thread: Thread) => {
    const firstEmailId = thread.messageIds[0];
    return emails.find(email => email.id === firstEmailId);
  };

  // Get last email in thread
  const getLastEmail = (thread: Thread) => {
    const lastEmailId = thread.messageIds[thread.messageIds.length - 1];
    return emails.find(email => email.id === lastEmailId);
  };

  // Get snippet from email body
  const getSnippet = (body: string) => {
    // Remove any HTML tags if present
    const plainText = body.replace(/<[^>]+>/g, '');
    // Get first 100 characters
    return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
  };

  // Get label color by id
  const getLabelColor = (labelId: string) => {
    const label = labels.find(l => l.id === labelId);
    return label?.color || '#808080';
  };

  return (
    <div className="flex-1 overflow-auto">
      {threads.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No emails found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {threads.map((thread) => {
            const firstEmail = getFirstEmail(thread);
            const lastEmail = getLastEmail(thread);
            
            if (!firstEmail || !lastEmail) return null;
            
            return (
              <div
                key={thread.id}
                className={`flex p-3 cursor-pointer hover:bg-gray-50 ${
                  thread.unread ? 'bg-blue-50' : ''
                }`}
                onClick={() => onThreadSelect(thread.id)}
              >
                <div className="flex-shrink-0 flex flex-col items-center mr-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(thread.id);
                    }}
                    className="text-lg leading-none focus:outline-none"
                  >
                    {thread.starred ? (
                      <span className="text-yellow-500">★</span>
                    ) : (
                      <span className="text-gray-300 hover:text-gray-400">☆</span>
                    )}
                  </button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <div className="font-medium truncate">
                      {thread.unread && <span className="w-2 h-2 bg-blue-500 rounded-full inline-block mr-1"></span>}
                      {thread.subject}
                    </div>
                    <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                      {formatDate(thread.lastMessageDate)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 truncate">
                    {firstEmail.from === lastEmail.from
                      ? firstEmail.from
                      : `${firstEmail.from} → ${lastEmail.from}`}
                  </div>
                  
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {getSnippet(lastEmail.body)}
                  </div>
                  
                  {thread.labels.length > 0 && (
                    <div className="flex mt-1 space-x-1">
                      {thread.labels.slice(0, 3).map((labelId) => (
                        <div
                          key={labelId}
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: `${getLabelColor(labelId)}20`,
                            color: getLabelColor(labelId),
                          }}
                        >
                          {labels.find(l => l.id === labelId)?.name || labelId}
                        </div>
                      ))}
                      {thread.labels.length > 3 && (
                        <div className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-500">
                          +{thread.labels.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
