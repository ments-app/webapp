"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import ChatInput from './ChatInput';
import { useRealtimeMessages } from './useRealtimeMessages';

// Types
interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Conversation {
  conversation_id: string;
  user1_id: string;
  user2_id: string;
  user1_username?: string;
  user2_username?: string;
  user1_full_name?: string;
  user2_full_name?: string;
  user1_avatar_url?: string | null;
  user2_avatar_url?: string | null;
  user1_is_verified?: boolean;
  user2_is_verified?: boolean;
  last_message?: string;
  updated_at: string;
  categories?: string[];
  unread_count_user1?: number;
  unread_count_user2?: number;
}

interface MessageItem {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

// --- Modal and Form Components ---
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md relative">
        <button 
          className="absolute top-2 right-3 text-gray-400 hover:text-white text-xl" 
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function CreateCategoryForm({ userId, onCreated, onCancel }: {
  userId: string;
  onCreated: (category: Category) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#ff0000');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/chat-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, name, color }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-bold">Create Category</h2>
      <input 
        className="w-full p-2 rounded bg-gray-800 text-white" 
        placeholder="Category name" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        required 
      />
      <input 
        className="w-full p-2 rounded" 
        type="color" 
        value={color} 
        onChange={(e) => setColor(e.target.value)} 
      />
      <div className="flex gap-2 justify-end">
        <button 
          type="button" 
          className="px-3 py-1 rounded bg-gray-700 text-white" 
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Create'}
        </button>
      </div>
    </form>
  );
}

function EditCategoryForm({ category, onUpdated, onCancel }: {
  category: Category;
  onUpdated: (category: Category) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color || '#ff0000');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/chat-categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, name, color }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated(data);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-bold">Edit Category</h2>
      <input 
        className="w-full p-2 rounded bg-gray-800 text-white" 
        placeholder="Category name" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        required 
      />
      <input 
        className="w-full p-2 rounded" 
        type="color" 
        value={color} 
        onChange={(e) => setColor(e.target.value)} 
      />
      <div className="flex gap-2 justify-end">
        <button 
          type="button" 
          className="px-3 py-1 rounded bg-gray-700 text-white" 
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function NewChatForm({ userId, categories, onCreated, onCancel }: {
  userId: string;
  categories: Category[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [otherUserId, setOtherUserId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1_id: userId, user2_id: otherUserId, category_id: categoryId }),
      });
      if (res.ok) {
        onCreated();
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-bold">Start New Chat</h2>
      <input 
        className="w-full p-2 rounded bg-gray-800 text-white" 
        placeholder="Other user ID" 
        value={otherUserId} 
        onChange={(e) => setOtherUserId(e.target.value)} 
        required 
      />
      <select 
        className="w-full p-2 rounded bg-gray-800 text-white" 
        value={categoryId} 
        onChange={(e) => setCategoryId(e.target.value)}
      >
        <option value="">No Category</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
      <div className="flex gap-2 justify-end">
        <button 
          type="button" 
          className="px-3 py-1 rounded bg-gray-700 text-white" 
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" 
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// Helper for colored dot
function Dot({ color }: { color: string }) {
  return (
    <span 
      className="inline-block w-3 h-3 rounded-full mr-2" 
      style={{ background: color }} 
    />
  );
}

// Wrap with Supabase edge function proxy (same pattern used in PostCard)
function getProxiedImageUrl(url: string | null): string | null {
  if (!url) return null;
  const base = 'https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/get-image?url=';
  return `${base}${encodeURIComponent(url)}`;
}

// Helper function to get other user's info
function getOtherUserInfo(conversation: Conversation, currentUserId: string) {
  if (conversation.user1_id === currentUserId) {
    return {
      id: conversation.user2_id,
      username: conversation.user2_username,
      fullName: conversation.user2_full_name,
      avatarUrl: conversation.user2_avatar_url,
      isVerified: conversation.user2_is_verified,
    };
  } else {
    return {
      id: conversation.user1_id,
      username: conversation.user1_username,
      fullName: conversation.user1_full_name,
      avatarUrl: conversation.user1_avatar_url,
      isVerified: conversation.user1_is_verified,
    };
  }
}

// Helper function to get unread count for current user
function getUnreadCount(conversation: Conversation, currentUserId: string) {
  if (conversation.user1_id === currentUserId) {
    return conversation.unread_count_user1 || 0;
  } else {
    return conversation.unread_count_user2 || 0;
  }
}

export default function MessagesPage() {
  const router = useRouter();
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [editCategory] = useState<Category | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const [categories, setCategories] = useState<Category[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages and reactions when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      setLoadingMessages(true);
      fetch(`/api/messages?conversationId=${selectedConversation.conversation_id}`)
        .then(res => res.json())
        .then((msgs: MessageItem[]) => setMessages(msgs))
        .finally(() => setLoadingMessages(false));
    }
  }, [selectedConversation]);

  // Real-time updates for messages
  useRealtimeMessages(
    selectedConversation ? selectedConversation.conversation_id : null,
    (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  );

  // Stats
  const totalUnread = conversations.reduce((sum, c) => sum + getUnreadCount(c, userId || ''), 0);

  // Fetch categories
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/chat-categories?userId=${userId}`)
      .then(res => res.json())
      .then(setCategories)
      .catch(console.error);
  }, [userId]);

  // Fetch conversations
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/messages?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        setConversations(data);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [userId]);

  // Filter for unique conversations by conversation_id
  const uniqueConversations: Conversation[] = Array.from(
    new Map(conversations.map((c) => [c.conversation_id, c])).values()
  );
  const filteredConversations = selectedCategory
    ? uniqueConversations.filter((c) => c.categories && c.categories.includes(selectedCategory))
    : uniqueConversations;

  // Category unread counts
  function getUnreadForCategory(catId: string) {
    return conversations
      .filter(c => c.categories && c.categories.includes(catId))
      .reduce((sum, c) => sum + getUnreadCount(c, userId || ''), 0);
  }

  // Don't render if auth is still loading
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-8 px-2">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if no user
  if (!user || !userId) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-8 px-2">
          <div className="text-center text-gray-400">Please log in to view messages</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto py-2 px-2 max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl">
        {/* Header Toolbar (desktop/tablet) */}
        <div className="hidden md:flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Messages</h1>
            <p className="text-sm text-gray-400">
              {uniqueConversations.length} conversations • {totalUnread} unread
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700"
              onClick={() => setShowCreateCategory(true)}
            >
              New Category
            </button>
            <button
              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setShowNewChat(true)}
            >
              New Chat
            </button>
          </div>
        </div>
        {/* Category Filter Bar */}
        <div className="flex gap-2 mb-4 overflow-x-auto md:overflow-visible md:flex-wrap md:justify-start sticky top-0 z-10 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 py-2">
          <button
            className={`px-4 py-1 rounded-full flex items-center font-bold text-sm md:text-base ${
              selectedCategory === null 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-800 text-gray-200'
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            All
            {totalUnread > 0 && (
              <span className="ml-2 bg-white/20 px-2 rounded-full text-xs">
                {totalUnread}
              </span>
            )}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`px-4 py-1 rounded-full flex items-center font-bold text-sm md:text-base ${
                selectedCategory === cat.id 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-800 text-gray-200'
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <Dot color={cat.color || '#f00'} />
              {cat.name}
              {getUnreadForCategory(cat.id) > 0 && (
                <span className="ml-2 bg-white/20 px-2 rounded-full text-xs">
                  {getUnreadForCategory(cat.id)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8 text-gray-400">
            Loading conversations...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-red-400">
            Error: {error}
          </div>
        )}

        {/* Conversations List */}
        {!loading && !error && (
          <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No conversations found
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherUser = getOtherUserInfo(conversation, userId);
                const unreadCount = getUnreadCount(conversation, userId);
                
                return (
                  <div
                    key={conversation.conversation_id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.conversation_id === conversation.conversation_id
                        ? 'bg-blue-600'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                    onClick={() => router.push(`/messages/${conversation.conversation_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                        {(() => {
                          const avatarSrc = getProxiedImageUrl(otherUser.avatarUrl || null);
                          return avatarSrc ? (
                          <Image
                            src={avatarSrc}
                            alt={otherUser.fullName || 'Avatar'}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const nextSibling = target.nextElementSibling as HTMLElement;
                              if (nextSibling) {
                                nextSibling.classList.remove('hidden');
                              }
                            }}
                          />
                          ) : null;
                        })()}
                        <div className={`w-full h-full flex items-center justify-center text-white text-lg font-bold ${
                          otherUser.avatarUrl ? 'hidden' : ''
                        }`}>
                          {otherUser.fullName?.charAt(0) || otherUser.username?.charAt(0) || '?'}
                        </div>
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white truncate">
                            {otherUser.fullName || otherUser.username || 'Unknown User'}
                          </h3>
                          {otherUser.isVerified && (
                            <span className="text-blue-400 text-sm">✓</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          @{otherUser.username}
                        </p>
                        <p className="text-sm text-gray-300 truncate mt-1">
                          {conversation.last_message}
                        </p>
                      </div>
                      
                      {/* Unread Badge & Time */}
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-400">
                          {new Date(conversation.updated_at).toLocaleDateString()}
                        </span>
                        {unreadCount > 0 && (
                          <span className="bg-emerald-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Selected Conversation Messages */}
        {selectedConversation && (
          <div className="mt-6 border-t border-gray-700 pt-4">
            <h2 className="text-lg font-bold mb-4 text-white">
              Chat with {getOtherUserInfo(selectedConversation, userId).fullName}
            </h2>
            {loadingMessages ? (
              <div className="text-center py-4 text-gray-400">Loading messages...</div>
            ) : (
              <div className="space-y-2 max-h-[600px] min-h-[300px] overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.sender_id === userId
                        ? 'bg-blue-600 ml-8 text-white'
                        : 'bg-gray-700 mr-8 text-gray-200'
                    }`}
                  >
                    <p>{message.content}</p>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <ChatInput
                conversationId={selectedConversation.conversation_id}
                userId={userId!}
                onSent={(newMessage: MessageItem) => {
                  setMessages(prev => [...prev, newMessage]);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (mobile only) */}
      <button
        className="fixed bottom-8 right-8 bg-emerald-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-3xl hover:bg-emerald-700 transition-colors md:hidden"
        onClick={() => setShowNewChat(true)}
      >
        +
      </button>

      {/* Create Category Modal */}
      {showCreateCategory && (
        <Modal onClose={() => setShowCreateCategory(false)}>
          <CreateCategoryForm
            userId={userId!}
            onCreated={(cat) => { 
              setCategories([...categories, cat]); 
              setShowCreateCategory(false); 
            }}
            onCancel={() => setShowCreateCategory(false)}
          />
        </Modal>
      )}

      {/* Edit Category Modal */}
      {showEditCategory && editCategory && (
        <Modal onClose={() => setShowEditCategory(false)}>
          <EditCategoryForm
            category={editCategory!}
            onUpdated={(cat) => {
              setCategories(categories.map(c => c.id === cat.id ? cat : c));
              setShowEditCategory(false);
            }}
            onCancel={() => setShowEditCategory(false)}
          />
        </Modal>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <Modal onClose={() => setShowNewChat(false)}>
          <NewChatForm
            userId={userId!}
            categories={categories}
            onCreated={() => { 
              setShowNewChat(false); 
              if (userId) {
                fetch(`/api/messages?userId=${userId}`)
                  .then(res => res.json())
                  .then(setConversations)
                  .catch(console.error);
              }
            }}
            onCancel={() => setShowNewChat(false)}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}