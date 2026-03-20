"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_username: string;
  other_full_name: string;
  other_avatar_url?: string;
  other_is_verified?: boolean;
  other_account_status?: string;
  last_message?: string;
  updated_at: string;
  unread_count: number;
  status: string;
  category_ids?: string[];
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface ConversationsContextType {
  conversations: Conversation[];
  categories: Category[];
  conversationCategories: Record<string, string[]>;
  loading: boolean;
  activeTab: string;
  searchQuery: string;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  refetchConversations: () => Promise<void>;
  filteredConversations: Conversation[];
  clearUnreadCount: (conversationId: string) => void;
  addCategory: (category: Category) => void;
  updateCategoryInContext: (id: string, updates: Partial<Category>) => void;
  removeCategoryFromContext: (id: string) => void;
  assignConversation: (conversationId: string, categoryId: string) => void;
  unassignConversation: (conversationId: string, categoryId: string) => void;
}

const ConversationsContext = createContext<ConversationsContextType | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [conversationCategories, setConversationCategories] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [convRes, catRes, convCatRes] = await Promise.allSettled([
        fetch(`/api/conversations?userId=${user.id}`),
        fetch(`/api/chat-categories`),
        fetch(`/api/conversation-categories`),
      ]);

      if (convRes.status === 'fulfilled' && convRes.value.ok) {
        const data = await convRes.value.json();
        setConversations(data);
      }

      if (catRes.status === 'fulfilled' && catRes.value.ok) {
        const data = await catRes.value.json();
        setCategories(data);
      }

      if (convCatRes.status === 'fulfilled' && convCatRes.value.ok) {
        const data = await convCatRes.value.json();
        const mappings: Record<string, string[]> = {};
        data.forEach((item: { conversation_id: string; category_id: string }) => {
          if (!mappings[item.conversation_id]) {
            mappings[item.conversation_id] = [];
          }
          mappings[item.conversation_id].push(item.category_id);
        });
        setConversationCategories(mappings);
      }
    } catch (error) {
      console.error('Error fetching conversation data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchAllData();
  }, [user?.id, fetchAllData]);

  // Filter conversations by search query and active category
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch =
      conv.other_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.other_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesCategory = true;
    if (activeTab === 'all') {
      matchesCategory = true;
    } else {
      const conversationCategoryIds = conversationCategories[conv.conversation_id] || [];
      matchesCategory = conversationCategoryIds.includes(activeTab);
    }

    return matchesSearch && matchesCategory;
  });

  const refetchConversations = async () => {
    setLoading(true);
    await fetchAllData();
  };

  const clearUnreadCount = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.conversation_id === conversationId
        ? { ...conv, unread_count: 0 }
        : conv
    ));
  }, []);

  // Category state management (local state updates, API calls done by caller)
  const addCategory = useCallback((category: Category) => {
    setCategories(prev => [...prev, category]);
  }, []);

  const updateCategoryInContext = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    ));
  }, []);

  const removeCategoryFromContext = useCallback((id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
    // Reset active tab if the deleted category was selected
    setActiveTab(prev => prev === id ? 'all' : prev);
    // Clean up conversation mappings
    setConversationCategories(prev => {
      const updated = { ...prev };
      for (const convId of Object.keys(updated)) {
        updated[convId] = updated[convId].filter(catId => catId !== id);
        if (updated[convId].length === 0) delete updated[convId];
      }
      return updated;
    });
  }, []);

  const assignConversation = useCallback((conversationId: string, categoryId: string) => {
    setConversationCategories(prev => {
      const current = prev[conversationId] || [];
      if (current.includes(categoryId)) return prev;
      return { ...prev, [conversationId]: [...current, categoryId] };
    });
  }, []);

  const unassignConversation = useCallback((conversationId: string, categoryId: string) => {
    setConversationCategories(prev => {
      const current = prev[conversationId] || [];
      const updated = current.filter(id => id !== categoryId);
      const newState = { ...prev };
      if (updated.length === 0) {
        delete newState[conversationId];
      } else {
        newState[conversationId] = updated;
      }
      return newState;
    });
  }, []);

  const value: ConversationsContextType = {
    conversations,
    categories,
    conversationCategories,
    loading,
    activeTab,
    searchQuery,
    setActiveTab,
    setSearchQuery,
    refetchConversations,
    filteredConversations,
    clearUnreadCount,
    addCategory,
    updateCategoryInContext,
    removeCategoryFromContext,
    assignConversation,
    unassignConversation,
  };

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversations must be used within a ConversationsProvider');
  }
  return context;
}
