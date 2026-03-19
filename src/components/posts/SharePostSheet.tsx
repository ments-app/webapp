"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, Check, Send, Search } from 'lucide-react';
import Image from 'next/image';
import { toProxyUrl } from '@/utils/imageUtils';
import { useAuth } from '@/context/AuthContext';

interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_username: string;
  other_full_name: string;
  other_avatar_url?: string;
  other_is_verified?: boolean;
}

interface SharePostSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postContent: string;
  postAuthorUsername: string;
}

export default function SharePostSheet({
  isOpen,
  onClose,
  postId,
  postContent,
  postAuthorUsername,
}: SharePostSheetProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setCopied(false);
    setSentTo(new Set());

    const fetchConversations = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/conversations?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [isOpen, user?.id]);

  const postUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/post/${postId}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [postUrl]);

  const handleSendToChat = useCallback(async (conversation: Conversation) => {
    if (sendingTo || !user?.id) return;
    setSendingTo(conversation.conversation_id);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.conversation_id,
          sender_id: user.id,
          content: postUrl,
        }),
      });

      if (res.ok) {
        setSentTo(prev => new Set(prev).add(conversation.conversation_id));

        // Send push notification
        try {
          await fetch('/api/push-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: user.id,
              recipientId: conversation.other_user_id,
              messageContent: `Shared a post by @${postAuthorUsername}`,
              conversationId: conversation.conversation_id,
              activeConversations: [],
              type: 'message',
            }),
          });
        } catch {
          // notification failure is non-critical
        }
      }
    } catch {
      // silently fail
    } finally {
      setSendingTo(null);
    }
  }, [sendingTo, user?.id, postUrl, postAuthorUsername]);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) setSearchQuery('');
  }, [isOpen]);

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c =>
        c.other_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.other_username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[420px] rounded-2xl bg-background border border-border/50 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[min(70vh,560px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30 flex-shrink-0">
          <h3 className="text-base font-semibold text-foreground">Share post</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Post preview snippet */}
          <div className="px-5 py-3 border-b border-border/20">
            <p className="text-xs text-muted-foreground mb-1">@{postAuthorUsername}</p>
            <p className="text-sm text-foreground/80 line-clamp-2">
              {postContent || 'Shared a post'}
            </p>
          </div>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors border-b border-border/20"
          >
            <div className="w-10 h-10 rounded-full bg-accent/40 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-foreground" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground text-left">Copy link</span>
            {copied && (
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Copied
              </span>
            )}
          </button>

          {/* Search conversations */}
          {!loading && conversations.length > 3 && (
            <div className="px-4 pt-3 pb-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-muted/30 border border-border/30 rounded-xl outline-none focus:border-primary/30 transition-colors placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          {/* Send to label */}
          {!loading && conversations.length > 0 && (
            <div className="px-5 pt-3 pb-1.5">
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">Send to</p>
            </div>
          )}

          {/* Conversations */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim() ? 'No one found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div className="pb-2">
              {filteredConversations.map((conv) => {
                const isSent = sentTo.has(conv.conversation_id);
                const isSending = sendingTo === conv.conversation_id;
                const avatarSrc = conv.other_avatar_url
                  ? toProxyUrl(conv.other_avatar_url, { width: 40, quality: 80 })
                  : null;

                return (
                  <button
                    key={conv.conversation_id}
                    onClick={() => !isSent && handleSendToChat(conv)}
                    disabled={isSending || isSent}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/30 transition-colors disabled:opacity-70"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                      {avatarSrc ? (
                        <Image
                          src={avatarSrc}
                          alt={conv.other_username || ''}
                          width={40} height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {(conv.other_full_name || conv.other_username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.other_full_name || conv.other_username || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{conv.other_username}</p>
                    </div>

                    {/* Send / Sent */}
                    {isSent ? (
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Sent
                      </span>
                    ) : isSending ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
