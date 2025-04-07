import { Email, Label } from "./EmailAppComponent";

interface EmailDetailProps {
  emails: Email[];
  labels: Label[];
  onReply: (email: Email) => void;
}

export function EmailDetail({ emails, labels, onReply }: EmailDetailProps) {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get label color by id
  const getLabelColor = (labelId: string) => {
    const label = labels.find(l => l.id === labelId);
    return label?.color || '#808080';
  };

  // Format email body with line breaks
  const formatBody = (body: string) => {
    return body.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));
  };

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No emails found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <h1 className="text-xl font-semibold mb-4">{emails[0].subject}</h1>
      
      <div className="space-y-6">
        {emails.map((email) => (
          <div key={email.id} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-50 p-3 flex justify-between items-start">
              <div>
                <div className="font-medium">{email.from}</div>
                <div className="text-sm text-gray-500">
                  To: {email.to}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatDate(email.date)}
                </div>
              </div>
              
              <button
                onClick={() => onReply(email)}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Reply
              </button>
            </div>
            
            <div className="p-4 bg-white">
              <div className="text-sm whitespace-pre-line">
                {formatBody(email.body)}
              </div>
              
              {email.labels.length > 0 && (
                <div className="flex mt-4 space-x-2">
                  {email.labels.map((labelId) => (
                    <div
                      key={labelId}
                      className="px-2 py-1 text-xs rounded"
                      style={{
                        backgroundColor: `${getLabelColor(labelId)}20`,
                        color: getLabelColor(labelId),
                      }}
                    >
                      {labels.find(l => l.id === labelId)?.name || labelId}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
