"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ChatInput from '../ChatInput';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeMessages } from '../useRealtimeMessages';
import { ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/utils/supabase';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  reply_to_id?: string;
}

interface Reaction {
  message_id: string;
  user_id: string;
  reaction: string;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface OtherUserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function ConversationPage() {
  const { conversationId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [otherUser, setOtherUser] = useState<OtherUserProfile | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages and reactions
  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/messages?conversationId=${String(conversationId)}`).then(res => res.json()),
      fetch(`/api/messages/reactions?conversationId=${String(conversationId)}`).then(res => res.json()),
    ])
      .then(([msgs, reacts]) => {
        setMessages(msgs);
        setReactions(reacts || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Load the other participant (username and avatar)
  useEffect(() => {
    if (!conversationId || !userId) return;
    (async () => {
      try {
        const { data: convo, error: convoErr } = await supabase
          .from('conversations')
          .select('id,user1_id,user2_id')
          .eq('id', String(conversationId))
          .single();
        if (convoErr) throw convoErr;
        const otherId = convo.user1_id === userId ? convo.user2_id : convo.user1_id;
        if (!otherId) return;
        const { data: profile, error: profErr } = await supabase
          .from('users')
          .select('id, full_name, username, avatar_url')
          .eq('id', otherId)
          .single();
        if (profErr) throw profErr;
        setOtherUser(profile as OtherUserProfile);
      } catch (e) {
        console.error('Load other user failed', e);
      }
    })();
  }, [conversationId, userId]);

  // Proxied image helper (consistent with PostCard/messages list)
  function getProxiedImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const base = 'https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/get-image?url=';
    return `${base}${encodeURIComponent(url)}`;
  }

  // Real-time updates for messages
  useRealtimeMessages(
    conversationId ? String(conversationId) : null,
    (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  );

  // Reaction handler helpers
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    if (!userId) return;
    await fetch('/api/messages/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, user_id: userId, reaction: emoji })
    });
    // Optimistically update
    setReactions((prev: Reaction[]) => {
      const existing = prev.find(r => r.message_id === messageId && r.user_id === userId);
      if (existing) {
        return prev.map(r =>
          r.message_id === messageId && r.user_id === userId ? { ...r, reaction: emoji } : r
        );
      } else {
        return [...prev, { message_id: messageId, user_id: userId, reaction: emoji }];
      }
    });
    setShowEmojiPicker(null);
  }, [userId]);

  const handleRemoveReaction = useCallback(async (messageId: string) => {
    if (!userId) return;
    await fetch('/api/messages/reactions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, user_id: userId })
    });
    setReactions((prev: Reaction[]) => prev.filter(r => !(r.message_id === messageId && r.user_id === userId)));
  }, [userId]);

  // Group reactions by message and emoji
  function getGroupedReactions(messageId: string): GroupedReaction[] {
    const grouped: Record<string, GroupedReaction> = {};
    reactions.filter(r => r.message_id === messageId).forEach(r => {
      if (!grouped[r.reaction]) grouped[r.reaction] = { emoji: r.reaction, count: 0, users: [] };
      grouped[r.reaction].count++;
      grouped[r.reaction].users.push(r.user_id);
    });
    return Object.values(grouped);
  }

  // Get current user's reaction for a message
  function getMyReaction(messageId: string) {
    return reactions.find(r => r.message_id === messageId && r.user_id === userId)?.reaction;
  }

  // Emoji picker
  const emojiOptions = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🔥', '💯'];

  function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
    const groups: Record<string, Message[]> = {};
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen mx-auto max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl">
        {/* Header */}
        <div className="bg-[#0f1b15]/80 backdrop-blur-sm border-b border-[#1e2a24] px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-between flex-shrink-0 md:sticky md:top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-full hover:bg-white/5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-emerald-700/60 flex items-center justify-center text-white font-semibold">
              {(() => {
                const src = getProxiedImageUrl(otherUser?.avatar_url ?? null);
                return src ? (
                  <Image src={src} alt={otherUser?.username || 'Avatar'} width={40} height={40} className="object-cover" />
                ) : (
                  <span>{(otherUser?.full_name || otherUser?.username || 'C').charAt(0).toUpperCase()}</span>
                );
              })()}
              {/* Presence dot (decorative) */}
              <span
                className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-[#0f1b15] bg-emerald-500"
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="text-white font-semibold leading-5">
                {otherUser?.full_name || otherUser?.username || 'Conversation'}
              </div>
              <div className="text-xs text-gray-400">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-gray-200">
            <button className="p-2.5 rounded-full hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-600" aria-label="Voice Call">
              <Phone className="h-5 w-5" />
            </button>
            <button className="p-2.5 rounded-full hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-600" aria-label="Video Call">
              <Video className="h-5 w-5" />
            </button>
            <button className="p-2.5 rounded-full hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-600" aria-label="More">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4" aria-busy="true" aria-live="polite">
              {/* Skeleton loader */}
              <div className="space-y-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%]">
                      <div className="h-4 w-24 bg-gray-800/60 rounded-full mb-2" />
                      <div className="bg-[#1d2320] rounded-2xl p-4">
                        <div className="h-3 bg-gray-800/70 rounded w-56 mb-2" />
                        <div className="h-3 bg-gray-800/70 rounded w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-red-400 text-lg mb-2">⚠️</div>
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-1" aria-live="polite" aria-relevant="additions" role="log">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-sm mx-auto p-6 rounded-2xl bg-[#0f1b15]/50 border border-[#1e2a24]">
                    <div className="text-3xl mb-2">💬</div>
                    <h2 className="text-white font-semibold mb-1">No messages yet</h2>
                    <p className="text-gray-400 text-sm">Say hi and start the conversation.</p>
                  </div>
                </div>
              )}
              {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
                <React.Fragment key={date}>
                  {/* Date Separator */}
                  <div className="flex justify-center my-6">
                    <div className="bg-[#0f1b15]/80 text-emerald-300 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-medium border border-emerald-900/40 shadow-sm tracking-wide">
                      {formatDate(date)}
                    </div>
                  </div>

                  {/* Messages */}
                  {msgs.map((message, index) => {
                    const isOwn = message.sender_id === userId;
                    const parentMsg = message.reply_to_id
                      ? messages.find((m: Message) => m.id === message.reply_to_id)
                      : null;
                    const groupedReactions = getGroupedReactions(message.id);
                    const myReaction = getMyReaction(message.id);
                    
                    // Check if this message should be grouped with the previous one
                    const prevMessage = index > 0 ? msgs[index - 1] : null;
                    const shouldGroup = prevMessage && 
                      prevMessage.sender_id === message.sender_id &&
                      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 300000; // 5 minutes

                    return (
                      <div
                        key={message.id}
                        className={`flex items-end ${isOwn ? 'justify-end' : 'justify-start'} ${shouldGroup ? 'mt-1' : 'mt-4'} px-1 md:px-4`}
                      >
                        {/* Incoming avatar on first in group */}
                        {!isOwn && !shouldGroup && (
                          <div className="mr-2 flex-shrink-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-700/60 flex items-center justify-center text-white text-xs">
                              {(() => {
                                const src = getProxiedImageUrl(otherUser?.avatar_url ?? null);
                                return src ? (
                                  <Image src={src} alt={otherUser?.username || 'Avatar'} width={32} height={32} className="object-cover" />
                                ) : (
                                  <span>{(otherUser?.full_name || otherUser?.username || 'C').charAt(0).toUpperCase()}</span>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        <div className={`relative group max-w-[78%] md:max-w-[65%] lg:max-w-[55%] ${isOwn ? 'ml-10 md:ml-12' : 'mr-10 md:mr-12'}`}>
                          {/* Message Bubble */}
                          <div
                            className={`px-3 md:px-4 py-2.5 md:py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl relative ${
                              isOwn
                                ? 'bg-emerald-600 text-white rounded-br-md'
                                : 'bg-[#1c2622] text-gray-100 rounded-bl-md border border-[#243228]'
                            }`}
                          >
                            {/* Reply Preview */}
                            {parentMsg && (
                              <div className={`mb-3 px-3 py-2 rounded-lg text-xs border-l-4 ${
                                isOwn 
                                  ? 'bg-blue-800/50 border-blue-300 text-blue-100' 
                                  : 'bg-gray-700/50 border-gray-500 text-gray-300'
                              }`}>
                                <div className="font-medium mb-1">Replying to:</div>
                                <div className="opacity-90 line-clamp-2">{parentMsg.content}</div>
                              </div>
                            )}
                            
                            {/* Message Content */}
                            <div className="text-sm md:text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                            
                            {/* Timestamp */}
                            <div className={`text-[10px] md:text-xs mt-2 ${
                              isOwn ? 'text-emerald-50/80' : 'text-gray-400'
                            } flex justify-end`}>
                              {new Date(message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>

                            {/* Reaction Button (appears on hover) */}
                            <button
                              onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                              className={`absolute -bottom-2 ${isOwn ? '-left-7 md:-left-8' : '-right-7 md:-right-8'} 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                bg-gray-700 hover:bg-gray-600 rounded-full p-1.5 border border-gray-600
                                text-gray-300 hover:text-white text-sm`}
                            >
                              😊
                            </button>
                          </div>

                          {/* Emoji Picker */}
                          {showEmojiPicker === message.id && (
                            <div className={`absolute top-full mt-2 ${isOwn ? 'right-0' : 'left-0'} 
                              bg-gray-800 rounded-xl p-2 shadow-xl border border-gray-700 z-10
                              grid grid-cols-4 gap-1`} role="menu" aria-label="Add reaction">
                              {emojiOptions.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(message.id, emoji)}
                                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Reactions Display */}
                          {groupedReactions.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              {groupedReactions.map(reaction => (
                                <button
                                  key={reaction.emoji}
                                  onClick={() => {
                                    if (myReaction === reaction.emoji) {
                                      handleRemoveReaction(message.id);
                                    } else {
                                      handleReact(message.id, reaction.emoji);
                                    }
                                  }}
                                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs
                                    transition-all duration-200 border ${
                                    myReaction === reaction.emoji
                                      ? 'bg-blue-600 border-blue-500 text-white'
                                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                  }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span>{reaction.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex-shrink-0 bg-[#0f1b15]/80 backdrop-blur-sm border-t border-[#1e2a24] p-3 md:p-4">
          <ChatInput
            conversationId={String(conversationId)}
            userId={userId!}
            onSent={msg => setMessages(msgs => [...msgs, msg])}
          />
        </div>
      </div>

      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowEmojiPicker(null)}
        />
      )}
    </DashboardLayout>
  );
}