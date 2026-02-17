import { useEffect } from 'react';
import { supabase } from '@/utils/supabase';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  reply_to_id?: string;
}

function toMessage(value: unknown): Message | null {
  if (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    'content' in value &&
    'sender_id' in value &&
    'created_at' in value
  ) {
    const v = value as {
      id: unknown;
      content: unknown;
      sender_id: unknown;
      created_at: unknown;
      reply_to_id?: unknown;
    };
    if (
      typeof v.id === 'string' &&
      typeof v.content === 'string' &&
      typeof v.sender_id === 'string' &&
      typeof v.created_at === 'string'
    ) {
      return {
        id: v.id,
        content: v.content,
        sender_id: v.sender_id,
        created_at: v.created_at,
        reply_to_id: typeof v.reply_to_id === 'string' ? v.reply_to_id : undefined,
      };
    }
  }
  return null;
}

// Calls onNewMessage(msg) whenever a new message is inserted in the conversation
export function useRealtimeMessages(
  conversationId: string | null,
  onNewMessage: (msg: Message) => void
) {
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel('messages:' + conversationId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.new) {
            const msg = toMessage(payload.new);
            if (msg) onNewMessage(msg);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, onNewMessage]);
}
