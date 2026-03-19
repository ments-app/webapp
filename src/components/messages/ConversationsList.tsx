"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Search, Edit, MoreVertical, Menu, MessageCircle, Plus, Tag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { VerifyBadge } from '@/components/ui/VerifyBadge';
import { useConversations } from '@/context/ConversationsContext';
import { toProxyUrl } from '@/utils/imageUtils';
import CategoryModal from './CategoryModal';
import CategoryAssignSheet from './CategoryAssignSheet';

export const ConversationsList = React.memo(function ConversationsList() {
  const {
    loading,
    conversations,
    categories,
    conversationCategories,
    activeTab,
    searchQuery,
    setActiveTab,
    setSearchQuery,
    filteredConversations,
    clearUnreadCount,
    addCategory,
    updateCategoryInContext,
    removeCategoryFromContext,
    assignConversation,
    unassignConversation,
  } = useConversations();

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>('create');
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; color?: string } | null>(null);

  // Category assign sheet state
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [assigningConversation, setAssigningConversation] = useState<{ id: string; name: string } | null>(null);

  // More menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Long press handling
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const getProxiedImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    return toProxyUrl(url, { width: 48, quality: 80 });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Category modal handlers
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryModalMode('create');
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category: { id: string; name: string; color?: string }) => {
    setEditingCategory(category);
    setCategoryModalMode('edit');
    setCategoryModalOpen(true);
  };

  const handleCategorySave = async (name: string, color: string) => {
    if (categoryModalMode === 'create') {
      const res = await fetch('/api/chat-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) throw new Error('Failed to create category');
      const data = await res.json();
      addCategory({ id: data.category.id, name: data.category.name, color: data.category.color });
    } else if (editingCategory) {
      const res = await fetch('/api/chat-categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCategory.id, name, color }),
      });
      if (!res.ok) throw new Error('Failed to update category');
      updateCategoryInContext(editingCategory.id, { name, color });
    }
  };

  const handleCategoryDelete = async () => {
    if (!editingCategory) return;
    const res = await fetch(`/api/chat-categories?id=${editingCategory.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete category');
    removeCategoryFromContext(editingCategory.id);
  };

  // Category assignment handlers (for assign sheet - long press)
  const handleToggleCategory = async (categoryId: string, assign: boolean) => {
    if (!assigningConversation) return;
    if (assign) {
      const res = await fetch('/api/conversation-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: assigningConversation.id,
          category_id: categoryId,
        }),
      });
      if (!res.ok) throw new Error('Failed to assign category');
      assignConversation(assigningConversation.id, categoryId);
    } else {
      const res = await fetch(`/api/conversation-categories?conversationId=${assigningConversation.id}`);
      const assignments = await res.json();
      const assignment = assignments.find(
        (a: { id: string; category_id: string }) => a.category_id === categoryId
      );
      if (assignment) {
        await fetch(`/api/conversation-categories?id=${assignment.id}`, { method: 'DELETE' });
      }
      unassignConversation(assigningConversation.id, categoryId);
    }
  };

  // Toggle conversation in/out of the editing category (for edit modal)
  const handleToggleConversationInCategory = async (conversationId: string, assign: boolean) => {
    if (!editingCategory) return;
    if (assign) {
      const res = await fetch('/api/conversation-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          category_id: editingCategory.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to assign');
      assignConversation(conversationId, editingCategory.id);
    } else {
      const res = await fetch(`/api/conversation-categories?conversationId=${conversationId}`);
      const assignments = await res.json();
      const assignment = assignments.find(
        (a: { id: string; category_id: string }) => a.category_id === editingCategory.id
      );
      if (assignment) {
        await fetch(`/api/conversation-categories?id=${assignment.id}`, { method: 'DELETE' });
      }
      unassignConversation(conversationId, editingCategory.id);
    }
  };

  // Get conversation IDs assigned to the editing category
  const getAssignedConvIds = () => {
    if (!editingCategory) return [];
    return Object.entries(conversationCategories)
      .filter(([, catIds]) => catIds.includes(editingCategory.id))
      .map(([convId]) => convId);
  };

  // Long press for conversation
  const handleTouchStart = useCallback((conversationId: string, name: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setAssigningConversation({ id: conversationId, name });
      setAssignSheetOpen(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Get category dots for a conversation
  const getCategoryDots = (conversationId: string) => {
    const catIds = conversationCategories[conversationId] || [];
    return categories.filter(c => catIds.includes(c.id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 rounded-full transition-colors hover:bg-accent/60 text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            Messages
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const activeCat = categories.find(c => c.id === activeTab);
              if (activeCat) {
                openEditCategory(activeCat);
              }
            }}
            disabled={activeTab === 'all'}
            className={`p-2 rounded-full transition-colors ${
              activeTab !== 'all'
                ? 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                : 'text-muted-foreground/30 cursor-default'
            }`}
          >
            <Edit className="w-5 h-5" />
          </button>
          {/* More menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-full transition-colors hover:bg-accent/60 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl bg-popover border border-border/50 shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      openCreateCategory();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent/40 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    New Category
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center border-b border-border/50 overflow-x-auto gap-1.5 px-3 py-2">
        {/* All Tab */}
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
          }`}
        >
          All
        </button>

        {/* Category Tabs */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveTab(category.id)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === category.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
          >
            {category.color && (
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  activeTab === category.id ? 'opacity-80' : ''
                }`}
                style={{ backgroundColor: category.color }}
              />
            )}
            {category.name}
          </button>
        ))}

      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative bg-accent/30 rounded-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full border-none outline-none text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto conversations-scroll">
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-muted rounded w-8"></div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => {
              const isDeactivated = conversation.other_account_status && conversation.other_account_status !== 'active';
              const convCategoryDots = getCategoryDots(conversation.conversation_id);
              const displayName = isDeactivated
                ? 'Deactivated User'
                : (conversation.other_full_name || conversation.other_username || 'Unknown');

              return (
                <Link
                  key={conversation.conversation_id}
                  href={`/messages/${conversation.conversation_id}`}
                  onClick={(e) => {
                    if (longPressTriggered.current) {
                      e.preventDefault();
                      return;
                    }
                    clearUnreadCount(conversation.conversation_id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setAssigningConversation({ id: conversation.conversation_id, name: displayName });
                    setAssignSheetOpen(true);
                  }}
                  onTouchStart={() => handleTouchStart(conversation.conversation_id, displayName)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  className={`flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors cursor-pointer border-l-4 border-transparent hover:border-primary ${isDeactivated ? 'opacity-60' : ''}`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-semibold ${isDeactivated ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
                      {(() => {
                        if (isDeactivated) {
                          return <span className="text-lg">?</span>;
                        }
                        const src = getProxiedImageUrl(conversation.other_avatar_url ?? null);
                        return src ? (
                          <Image
                            src={src}
                            alt={conversation.other_username || 'Avatar'}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-lg">
                            {(conversation.other_full_name || conversation.other_username || 'U').charAt(0).toUpperCase()}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate text-foreground">
                          {displayName}
                        </h3>
                        {!isDeactivated && conversation.other_is_verified && (
                          <VerifyBadge className="ml-1" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm truncate text-muted-foreground flex-1">
                        {isDeactivated ? 'This account has been deactivated' : (conversation.last_message || 'No messages yet')}
                      </p>
                      {/* Category dots */}
                      {convCategoryDots.length > 0 && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {convCategoryDots.slice(0, 3).map((cat) => (
                            <div
                              key={cat.id}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: cat.color || '#6b7280' }}
                              title={cat.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!isDeactivated && conversation.unread_count > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full mb-4 flex items-center justify-center bg-accent/30">
              {activeTab !== 'all' ? (
                <Tag className="w-8 h-8 text-muted-foreground" />
              ) : (
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              {activeTab !== 'all' ? 'No conversations in this category' : 'No conversations yet'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTab !== 'all'
                ? 'Long-press a conversation to add it to this category'
                : 'Start a conversation to see it here'}
            </p>
          </div>
        )}
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleCategorySave}
        onDelete={categoryModalMode === 'edit' ? handleCategoryDelete : undefined}
        initialName={editingCategory?.name || ''}
        initialColor={editingCategory?.color || ''}
        mode={categoryModalMode}
        conversations={categoryModalMode === 'edit' ? conversations : undefined}
        assignedConversationIds={categoryModalMode === 'edit' ? getAssignedConvIds() : undefined}
        onToggleConversation={categoryModalMode === 'edit' ? handleToggleConversationInCategory : undefined}
      />

      {/* Category Assign Sheet */}
      <CategoryAssignSheet
        isOpen={assignSheetOpen}
        onClose={() => {
          setAssignSheetOpen(false);
          setAssigningConversation(null);
        }}
        categories={categories}
        assignedCategoryIds={
          assigningConversation
            ? conversationCategories[assigningConversation.id] || []
            : []
        }
        onToggleCategory={handleToggleCategory}
        conversationName={assigningConversation?.name}
      />
    </div>
  );
});
