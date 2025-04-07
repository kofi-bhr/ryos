import { useState, useEffect } from "react";
import { Email, Label, User } from "./EmailAppComponent";

interface EmailComposeProps {
  user: User;
  replyToEmail: Email | null;
  labels: Label[];
  onSend: (email: Email) => void;
  onCancel: () => void;
}

export function EmailCompose({
  user,
  replyToEmail,
  labels,
  onSend,
  onCancel,
}: EmailComposeProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // Initialize form for reply
  useEffect(() => {
    if (replyToEmail) {
      setTo(replyToEmail.from);
      setSubject(
        replyToEmail.subject.startsWith("Re:") 
          ? replyToEmail.subject 
          : `Re: ${replyToEmail.subject}`
      );
      setBody(`\n\n\n-------- Original Message --------\nFrom: ${replyToEmail.from}\nDate: ${new Date(replyToEmail.date).toLocaleString()}\nTo: ${replyToEmail.to}\n\n${replyToEmail.body}`);
      setSelectedLabels(replyToEmail.labels);
    } else {
      // Initialize with user's signature for new emails
      setBody(`\n\n${user.signature}`);
    }
  }, [replyToEmail, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !subject) {
      alert("Please fill in all required fields");
      return;
    }
    
    const newEmail: Email = {
      id: "", // Will be set by parent component
      threadId: replyToEmail?.threadId || "", // Will be set by parent component for new emails
      from: user.email,
      to,
      subject,
      body,
      date: new Date().toISOString(),
      read: true,
      starred: false,
      labels: selectedLabels,
    };
    
    onSend(newEmail);
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelId)
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      <form onSubmit={handleSubmit} className="h-full flex flex-col">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            type="text"
            value={user.email}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        
        <div className="mb-4 flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full h-full min-h-[200px] px-3 py-2 border border-gray-300 rounded text-sm resize-none"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Labels
          </label>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => toggleLabel(label.id)}
                className={`px-2 py-1 text-xs rounded border ${
                  selectedLabels.includes(label.id)
                    ? `bg-${label.color} text-white`
                    : `border-gray-300 text-gray-700 hover:bg-gray-100`
                }`}
                style={{
                  backgroundColor: selectedLabels.includes(label.id) ? label.color : undefined,
                  color: selectedLabels.includes(label.id) ? 'white' : undefined,
                }}
              >
                {label.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
