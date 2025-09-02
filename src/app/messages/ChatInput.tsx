import React, { useState } from 'react';

interface ChatInputProps {
  conversationId: string;
  userId: string;
  onSent: (message: Message) => void;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  reply_to_id?: string;
}

export default function ChatInput({ conversationId, userId, onSent }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientId, setRecipientId] = useState<string | null>(null);

  // Fetch recipient ID for this conversation
  React.useEffect(() => {
    async function fetchRecipient() {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`);
        if (res.ok) {
          const convo = await res.json();
          // Determine the recipient based on who the current user is
          const recipient = convo.user1_id === userId ? convo.user2_id : convo.user1_id;
          setRecipientId(recipient);
        }
      } catch (error) {
        console.error('Error fetching recipient:', error);
      }
    }
    if (conversationId && userId) {
      fetchRecipient();
    }
  }, [conversationId, userId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    
    try {
      // Send the message
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, sender_id: userId, content }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setContent('');
        onSent(data.message);
        
        // Send push notification if we have recipient ID
        if (recipientId) {
          try {
            await fetch('/api/push-notification', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                senderId: userId,
                recipientId: recipientId,
                messageContent: content,
                conversationId: conversationId,
                activeConversations: [],
                type: 'message'
              }),
            });
          } catch (notifError) {
            console.error('Push notification failed:', notifError);
            // Don't block message send if notification fails
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSend} className="flex items-center gap-2">
      <input
        className="flex-1 rounded-full px-4 py-2.5 bg-gray-800/60 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        placeholder="Type a message..."
        value={content}
        onChange={e => setContent(e.target.value)}
        disabled={loading}
        autoFocus
      />
      <button
        type="submit"
        className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={loading || !content.trim()}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Sending...
          </span>
        ) : (
          'Send'
        )}
      </button>
    </form>
  );
}
