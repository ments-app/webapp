# Flutter Chat/Messaging System - Complete Implementation Guide

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Database Schema](#database-schema)
3. [Chat Categories System](#chat-categories-system)
4. [Conversations Management](#conversations-management)
5. [Message System](#message-system)
6. [Real-time Features](#real-time-features)
7. [Unread Message Tracking](#unread-message-tracking)
8. [Chat Request Approval System](#chat-request-approval-system)
9. [UI Components](#ui-components)
10. [Notification System](#notification-system)
11. [Performance Optimizations](#performance-optimizations)
12. [Cache Management](#cache-management)
13. [Next.js Implementation Guide](#nextjs-implementation-guide)

## System Architecture Overview

The messaging system follows a clean architecture pattern with clear separation between data, domain, and presentation layers:

```
lib/
├── features/
│   ├── data/
│   │   ├── models/
│   │   │   └── chat_category_model.dart      # Chat category data models
│   │   └── repositories/
│   │       └── chat_category_repository_impl.dart  # Repository implementation
│   └── presentation/
│       ├── pages/
│       │   └── chat/
│       │       ├── chat_list_page.dart       # Chat list with categories
│       │       └── chat_detail_page.dart     # Individual chat interface
│       └── widgets/
│           └── chat/
│               ├── build_message_bubble.dart # Message bubble component
│               └── build_message_input.dart  # Message input component
└── core/
    └── services/
        ├── cache_manager.dart                # Offline support & caching
        └── notification_service.dart        # Firebase notifications
```

## Database Schema

### Core Tables

#### 1. Conversations Table
```sql
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message TEXT,
    status TEXT NOT NULL DEFAULT 'approved',  -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT different_users CHECK (user1_id <> user2_id)
);

-- Unique constraint to prevent duplicate conversations
CREATE UNIQUE INDEX idx_conversations_unique_pair 
ON public.conversations (
    LEAST(user1_id, user2_id), 
    GREATEST(user1_id, user2_id)
);

-- Performance indexes
CREATE INDEX idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_users ON conversations(user1_id, user2_id, updated_at DESC);
```

#### 2. Messages Table
```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    reply_to_id UUID REFERENCES public.messages(id),  -- For message replies
    message_type TEXT DEFAULT 'text',                 -- 'text', 'image', 'video', etc.
    media_url TEXT,                                   -- For media messages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,                 -- When message was read
    is_read BOOLEAN DEFAULT FALSE                     -- Read status flag
);

-- Performance indexes
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_conversation_sender_unread 
ON messages(conversation_id, sender_id) WHERE is_read = false;
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read, sender_id);
```

#### 3. Chat Categories Tables
```sql
-- User-defined chat categories
CREATE TABLE public.chat_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,  -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT chat_categories_pkey PRIMARY KEY (id)
);

-- Junction table for conversation-category relationships
CREATE TABLE public.conversation_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.chat_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT conversation_categories_pkey PRIMARY KEY (id),
    CONSTRAINT unique_conversation_category UNIQUE (conversation_id, category_id)
);

-- Indexes
CREATE INDEX idx_chat_categories_user_id ON public.chat_categories(user_id);
CREATE INDEX idx_conversation_categories_conversation_id ON public.conversation_categories(conversation_id);
CREATE INDEX idx_conversation_categories_category_id ON public.conversation_categories(category_id);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_categories ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations they're part of"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Recipients can update conversation status"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = user2_id)
    WITH CHECK (auth.uid() = user2_id AND status IN ('approved', 'rejected'));

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert messages in their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
        AND sender_id = auth.uid()
    );

-- Chat categories policies
CREATE POLICY "Users can manage their own categories"
    ON public.chat_categories FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own conversation categories"
    ON public.conversation_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_categories cc
            WHERE cc.id = category_id AND cc.user_id = auth.uid()
        )
    );
```

## Chat Categories System

### Data Model (Flutter)
```dart
// File: lib/features/data/models/chat_category_model.dart
class ChatCategory {
  final String id;
  final String userId;
  final String name;
  final String? color;  // Hex color code
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String>? conversationIds;  // Populated from junction table
  final int? unreadCount;              // Calculated field

  // Convert hex color to Flutter Color object
  Color? get colorValue {
    if (color == null || color!.isEmpty) return null;
    try {
      return Color(int.parse(color!.replaceFirst('#', '0xFF')));
    } catch (e) {
      return null;
    }
  }
}

class ConversationCategory {
  final String id;
  final String conversationId;
  final String categoryId;
  final DateTime createdAt;
}
```

### Repository Implementation
```dart
// File: lib/features/data/repositories/chat_category_repository_impl.dart
class ChatCategoryRepositoryImpl {
  final SupabaseClient _supabase = Supabase.instance.client;
  final CacheManager _cacheManager = CacheManager();

  // Cache-first strategy with offline fallback
  Future<List<ChatCategory>> getCategoriesForUser(String userId) async {
    // 1. Try cache first
    final cachedCategories = await _cacheManager.getCachedChatCategories(userId);
    
    // 2. Check connectivity
    final hasInternet = await _cacheManager.hasInternetConnection();
    
    if (!hasInternet) {
      return _handleOfflineCategories(cachedCategories, userId);
    }
    
    // 3. Fetch fresh data
    try {
      final response = await _supabase
          .from('chat_categories')
          .select('*')
          .eq('user_id', userId)
          .order('name');

      final categories = response
          .map<ChatCategory>((json) => ChatCategory.fromJson(json))
          .toList();

      // Add unread counts
      for (int i = 0; i < categories.length; i++) {
        categories[i] = await _addUnreadCountToCategory(categories[i]);
      }

      // Cache the results
      if (categories.isNotEmpty) {
        await _cacheManager.cacheChatCategories(
          categories.map((c) => c.toJson()).toList(), 
          userId
        );
      }

      return categories;
    } catch (e) {
      // Fallback to cache on network error
      return _handleOfflineCategories(cachedCategories, userId);
    }
  }

  // Get unread count for category
  Future<ChatCategory> _addUnreadCountToCategory(ChatCategory category) async {
    final conversationIds = await getConversationsInCategory(category.id);
    
    if (conversationIds.isEmpty) {
      return category.copyWith(unreadCount: 0);
    }

    final currentUserId = _supabase.auth.currentUser!.id;
    final response = await _supabase
        .from('messages')
        .select('id')
        .inFilter('conversation_id', conversationIds)
        .neq('sender_id', currentUserId)
        .eq('is_read', false);

    return category.copyWith(
      unreadCount: response.length,
      conversationIds: conversationIds,
    );
  }
}
```

### API Operations

#### Create Category
```dart
Future<ChatCategory> createCategory(String userId, String name, String? color) async {
  final response = await _supabase
      .from('chat_categories')
      .insert({
        'user_id': userId,
        'name': name,
        'color': color,
      })
      .select()
      .single();

  return ChatCategory.fromJson(response);
}
```

#### Assign Conversation to Category
```dart
Future<void> addConversationToCategory(String conversationId, String categoryId) async {
  // Check if already exists
  final existing = await _supabase
      .from('conversation_categories')
      .select()
      .eq('conversation_id', conversationId)
      .eq('category_id', categoryId);

  if (existing.isEmpty) {
    await _supabase.from('conversation_categories').insert({
      'conversation_id': conversationId,
      'category_id': categoryId,
    });
  }
}
```

## Conversations Management

### Database Functions

#### Safe Conversation Creation
```sql
-- Function handles race conditions and duplicate prevention
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_user1_id UUID,
    p_user2_id UUID
) RETURNS TABLE (
    conversation_id UUID,
    conversation_status TEXT,
    actual_user1_id UUID,
    actual_user2_id UUID,
    was_created BOOLEAN
) AS $$
DECLARE
    v_canonical_user1 UUID;
    v_canonical_user2 UUID;
    v_conversation_record RECORD;
BEGIN
    -- Ensure canonical ordering (smaller UUID first)
    SELECT canonical_user1, canonical_user2 
    INTO v_canonical_user1, v_canonical_user2
    FROM canonical_user_pair(p_user1_id, p_user2_id);
    
    -- Try to find existing conversation
    SELECT c.id, c.status, c.user1_id, c.user2_id
    INTO v_conversation_record
    FROM public.conversations c
    WHERE (c.user1_id = p_user1_id AND c.user2_id = p_user2_id)
       OR (c.user1_id = p_user2_id AND c.user2_id = p_user1_id)
    LIMIT 1;
    
    -- Return existing or create new
    IF v_conversation_record IS NOT NULL THEN
        RETURN QUERY SELECT 
            v_conversation_record.id,
            v_conversation_record.status,
            p_user1_id, 
            p_user2_id, 
            FALSE;
    ELSE
        -- Create new with canonical ordering
        INSERT INTO public.conversations (user1_id, user2_id)
        VALUES (v_canonical_user1, v_canonical_user2)
        RETURNING id, status, user1_id, user2_id INTO v_conversation_record;
        
        RETURN QUERY SELECT 
            v_conversation_record.id,
            v_conversation_record.status,
            p_user1_id,
            p_user2_id,
            TRUE;
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle race condition
        SELECT c.id, c.status, c.user1_id, c.user2_id
        INTO v_conversation_record
        FROM public.conversations c
        WHERE (c.user1_id = p_user1_id AND c.user2_id = p_user2_id)
           OR (c.user1_id = p_user2_id AND c.user2_id = p_user1_id)
        LIMIT 1;
        
        RETURN QUERY SELECT 
            v_conversation_record.id,
            v_conversation_record.status,
            p_user1_id,
            p_user2_id,
            FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Optimized Conversations Query
```sql
-- High-performance query with all user data and unread counts
CREATE OR REPLACE FUNCTION get_user_conversations(user_uuid uuid)
RETURNS TABLE (
    conversation_id uuid,
    other_user_id uuid,
    other_username text,
    other_full_name text,
    other_avatar_url text,
    other_is_verified boolean,
    last_message text,
    updated_at timestamp with time zone,
    unread_count bigint
) AS $$
  SELECT 
    ccv.conversation_id,
    CASE 
      WHEN ccv.user1_id = user_uuid THEN ccv.user2_profile_id
      ELSE ccv.user1_profile_id
    END as other_user_id,
    CASE 
      WHEN ccv.user1_id = user_uuid THEN ccv.user2_username
      ELSE ccv.user1_username
    END as other_username,
    CASE 
      WHEN ccv.user1_id = user_uuid THEN ccv.user2_full_name
      ELSE ccv.user1_full_name
    END as other_full_name,
    CASE 
      WHEN ccv.user1_id = user_uuid THEN ccv.user2_avatar_url
      ELSE ccv.user1_avatar_url
    END as other_avatar_url,
    CASE 
      WHEN ccv.user1_id = user_uuid THEN ccv.user2_is_verified
      ELSE ccv.user1_is_verified
    END as other_is_verified,
    ccv.last_message,
    ccv.updated_at,
    CASE 
      WHEN ccv.user1_id = user_uuid THEN ccv.unread_count_user1
      ELSE ccv.unread_count_user2
    END as unread_count
  FROM chat_conversations_view ccv
  WHERE ccv.user1_id = user_uuid OR ccv.user2_id = user_uuid
  ORDER BY ccv.updated_at DESC NULLS LAST
  LIMIT 20;
$$ LANGUAGE sql STABLE;
```

### Flutter Implementation

```dart
// Usage in chat list page
Future<void> _loadChats() async {
  final currentUserId = supabase.auth.currentUser!.id;
  
  // Use optimized RPC call
  final conversationsResponse = await supabase.rpc(
    'get_user_conversations',
    params: {'user_uuid': currentUserId}
  );

  // Process and enrich data
  final enrichedConversations = <Map<String, dynamic>>[];
  
  for (final conversation in conversationsResponse) {
    enrichedConversations.add({
      'id': conversation['conversation_id'],
      'other_user_id': conversation['other_user_id'],
      'other_username': conversation['other_username'],
      'other_full_name': conversation['other_full_name'],
      'other_avatar_url': conversation['other_avatar_url'],
      'other_is_verified': conversation['other_is_verified'] ?? false,
      'last_message': conversation['last_message'],
      'updated_at': conversation['updated_at'],
      'unread_count': conversation['unread_count'] ?? 0,
    });
  }
}
```

## Message System

### Database Operations

#### Send Message
```dart
Future<Map<String, dynamic>> sendMessage({
  required String conversationId,
  required String content,
  String? replyToId,
  String messageType = 'text',
  String? mediaUrl,
}) async {
  final response = await supabase
    .from('messages')
    .insert({
      'conversation_id': conversationId,
      'sender_id': supabase.auth.currentUser!.id,
      'content': content,
      'reply_to_id': replyToId,
      'message_type': messageType,
      'media_url': mediaUrl,
      'is_read': false,
    })
    .select()
    .single();

  return response;
}
```

#### Load Messages with Pagination
```dart
Future<List<Map<String, dynamic>>> loadMessages(
  String conversationId, {
  int limit = 20,
  String? beforeMessageId,
}) async {
  var query = supabase
      .from('messages')
      .select('*, reply_to:reply_to_id(*)')
      .eq('conversation_id', conversationId)
      .order('created_at', ascending: false)
      .limit(limit);

  if (beforeMessageId != null) {
    // Get timestamp of the before message for pagination
    final beforeMessage = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', beforeMessageId)
        .single();
    
    query = query.lt('created_at', beforeMessage['created_at']);
  }

  final response = await query;
  return response.reversed.toList(); // Reverse to show oldest first
}
```

#### Mark Messages as Read
```dart
Future<void> markMessagesAsRead(String conversationId) async {
  final currentUserId = supabase.auth.currentUser!.id;
  
  await supabase
      .from('messages')
      .update({
        'is_read': true,
        'read_at': DateTime.now().toUtc().toIso8601String(),
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);
}
```

### Message Types Support

The system supports different message types through the `message_type` and `media_url` fields:

1. **Text Messages**: Default type with content in `content` field
2. **Image Messages**: `message_type: 'image'`, URL in `media_url`
3. **Video Messages**: `message_type: 'video'`, URL in `media_url`
4. **Reply Messages**: Any type with `reply_to_id` set

### Database Triggers

```sql
-- Auto-update conversation timestamp and last message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NEW.created_at,
      last_message = NEW.content
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();
```

## Real-time Features

### Supabase Realtime Configuration

```sql
-- Enable realtime for messages table
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE messages;
```

### Flutter Real-time Implementation

```dart
class _ChatDetailPageState extends State<ChatDetailPage> {
  RealtimeChannel? _messagesSubscription;
  RealtimeChannel? _typingSubscription;

  void _subscribeToMessages() {
    final conversationId = _conversationId;
    
    _messagesSubscription = supabase
        .channel('messages:$conversationId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'conversation_id',
            value: conversationId,
          ),
          callback: (payload) {
            final newMessage = payload.newRecord;
            if (newMessage != null) {
              _handleNewMessage(newMessage);
            }
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public', 
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'conversation_id', 
            value: conversationId,
          ),
          callback: (payload) {
            final updatedMessage = payload.newRecord;
            if (updatedMessage != null) {
              _handleMessageUpdate(updatedMessage);
            }
          },
        )
        .subscribe();
  }

  void _handleNewMessage(Map<String, dynamic> messageData) {
    setState(() {
      // Add message to list if it's not from current user
      if (messageData['sender_id'] != _currentUserId) {
        _messages.insert(0, messageData);
        _unreadMessageCount++;
        
        // Show new message indicator if user is not at bottom
        if (!_isUserNearBottom) {
          _showNewMessageIndicator = true;
        }
      }
    });

    // Mark as read if user is viewing and at bottom
    if (_isUserNearBottom && messageData['sender_id'] != _currentUserId) {
      _markMessagesAsRead();
    }
  }

  void _subscribeToTypingIndicator() {
    _typingSubscription = supabase
        .channel('typing:${_conversationId}')
        .onBroadcast(
          event: 'typing',
          callback: (payload) {
            final isTyping = payload['isTyping'] as bool;
            final userId = payload['userId'] as String;
            
            if (userId != _currentUserId) {
              setState(() {
                _isTyping = isTyping;
              });
              
              // Auto-hide typing indicator after 3 seconds
              if (isTyping) {
                Timer(Duration(seconds: 3), () {
                  if (mounted) {
                    setState(() {
                      _isTyping = false;
                    });
                  }
                });
              }
            }
          },
        )
        .subscribe();
  }

  void _sendTypingIndicator(bool isTyping) {
    _typingSubscription?.sendBroadcastMessage(
      event: 'typing',
      payload: {
        'isTyping': isTyping,
        'userId': _currentUserId,
      },
    );
  }
}
```

### Typing Indicators

```dart
// In message input field
TextField(
  controller: _messageController,
  onChanged: (text) {
    // Send typing indicator
    if (text.isNotEmpty && !_isTyping) {
      _sendTypingIndicator(true);
      setState(() => _isTyping = true);
      
      // Auto-stop typing after 2 seconds
      Timer(Duration(seconds: 2), () {
        _sendTypingIndicator(false);
        setState(() => _isTyping = false);
      });
    }
  },
)
```

## Unread Message Tracking

### Optimized Database Function

```sql
-- Single query to get total unread count for user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(unread_count), 0)::INTEGER
  FROM (
    SELECT COUNT(*) as unread_count
    FROM messages m
    INNER JOIN conversations c ON m.conversation_id = c.id
    WHERE (
      (c.user1_id = user_id AND m.sender_id = c.user2_id) OR
      (c.user2_id = user_id AND m.sender_id = c.user1_id)
    )
    AND c.status = 'approved'
    AND m.is_read = false
    GROUP BY c.id
  ) AS conversation_counts;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### Flutter Implementation

```dart
// Get total unread count
Future<int> getTotalUnreadCount() async {
  final currentUserId = supabase.auth.currentUser!.id;
  final response = await supabase.rpc(
    'get_unread_message_count',
    params: {'user_id': currentUserId}
  );
  return response as int;
}

// Update badge count
void _updateUnreadBadge() async {
  final unreadCount = await getTotalUnreadCount();
  // Update app badge or notification count
}
```

## Chat Request Approval System

### Database Logic

```sql
-- Auto-determine chat request status based on follow relationships
CREATE OR REPLACE FUNCTION determine_chat_request_status()
RETURNS TRIGGER AS $$
DECLARE
  user1_follows_user2 BOOLEAN;
  user2_follows_user1 BOOLEAN;
BEGIN
  -- Check follow relationships
  SELECT EXISTS (
    SELECT 1 FROM public.user_follows 
    WHERE follower_id = NEW.user1_id AND followee_id = NEW.user2_id
  ) INTO user1_follows_user2;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_follows 
    WHERE follower_id = NEW.user2_id AND followee_id = NEW.user1_id
  ) INTO user2_follows_user1;
  
  -- Auto-approve if recipient follows sender or mutual follow
  IF user2_follows_user1 OR (user1_follows_user2 AND user2_follows_user1) THEN
    NEW.status := 'approved';
  ELSE
    NEW.status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic status setting
CREATE TRIGGER set_conversation_status_trigger
BEFORE INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION determine_chat_request_status();
```

### Flutter Implementation

```dart
class _ChatDetailPageState extends State<ChatDetailPage> {
  String? _conversationStatus;
  bool get _isApproved => _conversationStatus == 'approved';
  bool get _isRequestPending => _conversationStatus == 'pending';
  bool get _amIReceiver => _currentUserId == _user2Id;
  bool get _canSendMessages => _isApproved || (_amISender && _messages.isEmpty);

  // Approve chat request
  Future<void> _approveChatRequest() async {
    await supabase
        .from('conversations')
        .update({'status': 'approved'})
        .eq('id', _conversationId);
        
    setState(() {
      _conversationStatus = 'approved';
    });
  }

  // Reject chat request  
  Future<void> _rejectChatRequest() async {
    await supabase
        .from('conversations')
        .update({'status': 'rejected'})
        .eq('id', _conversationId);
        
    Navigator.pop(context);
  }

  Widget _buildChatRequestUI() {
    if (_isRequestPending && _amIReceiver) {
      return Container(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Text('${widget.otherUserName} wants to message you'),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _approveChatRequest,
                    child: Text('Accept'),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _rejectChatRequest,
                    child: Text('Decline'),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }
    return SizedBox.shrink();
  }
}
```

## UI Components

### Message Bubble Component

```dart
// File: lib/features/presentation/widgets/chat/build_message_bubble.dart
class MessageBubble extends StatelessWidget {
  final Map<String, dynamic> message;
  final bool isMe;
  final bool isRead;
  final String? reaction;
  final Map<String, dynamic>? replyTo;
  final String timestamp;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4.0, horizontal: 8.0),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) _buildAvatar(),
          Flexible(
            child: GestureDetector(
              onTap: onTap,
              onLongPress: onLongPress,
              child: Container(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.75
                ),
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isMe ? fcolor.incomingBubble : fcolor.blueBg,
                  borderRadius: BorderRadius.circular(20).copyWith(
                    bottomRight: isMe ? Radius.circular(5) : Radius.circular(20),
                    bottomLeft: !isMe ? Radius.circular(5) : Radius.circular(20),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (replyTo != null) _buildReplyPreview(replyTo!),
                    Text(
                      message['content'] as String,
                      style: TextStyle(color: fcolor.whiteHead1, fontSize: 16),
                    ),
                    SizedBox(height: 4),
                    _buildMessageFooter(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReplyPreview(Map<String, dynamic> replyTo) {
    return Container(
      margin: EdgeInsets.only(bottom: 8),
      padding: EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: fcolor.replyBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: fcolor.replyBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.reply, size: 12, color: fcolor.neonGreen),
              SizedBox(width: 4),
              Text(
                replyTo['sender_id'] == message['sender_id'] ? 'you' : 'them',
                style: TextStyle(color: fcolor.neonGreen, fontSize: 10),
              ),
            ],
          ),
          SizedBox(height: 4),
          Text(
            replyTo['content'] as String,
            style: TextStyle(color: fcolor.greyLabel, fontSize: 12),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildMessageFooter() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(
          timestamp,
          style: TextStyle(color: fcolor.greyLabel, fontSize: 10)
        ),
        if (isMe) ...[
          SizedBox(width: 4),
          Icon(
            isRead ? Icons.done_all : Icons.done,
            size: 12,
            color: isRead ? fcolor.neonGreen : fcolor.greyLabel
          ),
        ],
      ],
    );
  }
}
```

### Message Input Component

```dart
// File: lib/features/presentation/widgets/chat/build_message_input.dart
class MessageInput extends StatelessWidget {
  final TextEditingController controller;
  final Map<String, dynamic>? pendingReply;
  final VoidCallback onCancelReply;
  final VoidCallback onSend;
  final VoidCallback onImageUpload;
  final bool canSend;
  final bool isReceiver;
  final bool isApproved;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: fcolor.blueBg.withValues(alpha: 0.6),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        boxShadow: [
          BoxShadow(
            color: fcolor.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: Offset(0, -2)
          )
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (pendingReply != null) _buildReplyPreview(),
            _buildInputRow(),
          ],
        ),
      ),
    );
  }

  Widget _buildReplyPreview() {
    return Container(
      padding: EdgeInsets.all(8),
      margin: EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: fcolor.replyBg,
        borderRadius: BorderRadius.circular(12)
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              pendingReply!['content'] as String,
              style: TextStyle(color: fcolor.neonGreen),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            icon: Icon(Icons.close, size: 18, color: fcolor.greyLabel),
            onPressed: onCancelReply,
          ),
        ],
      ),
    );
  }

  Widget _buildInputRow() {
    return Row(
      children: [
        IconButton(
          icon: Icon(Icons.image_outlined, color: fcolor.neonGreen),
          onPressed: onImageUpload,
        ),
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: fcolor.bgBlack,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: controller.text.isNotEmpty
                    ? fcolor.darkGreen
                    : fcolor.transparent,
                width: 1,
              ),
            ),
            child: TextField(
              controller: controller,
              style: TextStyle(color: fcolor.whiteHead1),
              enabled: !(isReceiver && !isApproved),
              decoration: InputDecoration(
                hintText: isReceiver && !isApproved
                    ? 'Accept the request to reply'
                    : 'Type a message...',
                hintStyle: TextStyle(color: fcolor.greyLabel),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none
                ),
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              keyboardType: TextInputType.multiline,
              maxLines: 5,
              minLines: 1,
            ),
          ),
        ),
        SizedBox(width: 8),
        _buildSendButton(),
      ],
    );
  }

  Widget _buildSendButton() {
    return Material(
      color: canSend ? fcolor.darkGreen : fcolor.greyBg,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: canSend ? onSend : null,
        child: Container(
          padding: EdgeInsets.all(12),
          child: Icon(
            Icons.send_rounded,
            color: canSend ? fcolor.neonGreen : fcolor.greyLabel,
            size: 20,
          ),
        ),
      ),
    );
  }
}
```

### Chat List Item

```dart
Widget _buildConversationItem(Map<String, dynamic> conversation) {
  final otherUserName = conversation['other_username'] ?? 'Unknown User';
  final lastMessage = conversation['last_message'] ?? '';
  final unreadCount = conversation['unread_count'] ?? 0;
  final updatedAt = conversation['updated_at'] as String?;
  
  return Card(
    margin: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    child: ListTile(
      leading: CircleAvatar(
        backgroundImage: conversation['other_avatar_url'] != null 
          ? CachedNetworkImageProvider(conversation['other_avatar_url'])
          : null,
        child: conversation['other_avatar_url'] == null
          ? Icon(Icons.person)
          : null,
      ),
      title: Row(
        children: [
          Expanded(child: Text(otherUserName)),
          if (conversation['other_is_verified'] == true)
            VerifyBadge(size: 16),
          if (unreadCount > 0)
            Container(
              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: fcolor.neonGreen,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                unreadCount.toString(),
                style: TextStyle(
                  color: fcolor.bgBlack,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      subtitle: Text(
        lastMessage,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: unreadCount > 0 ? fcolor.whiteHead1 : fcolor.greyLabel,
          fontWeight: unreadCount > 0 ? FontWeight.w500 : FontWeight.normal,
        ),
      ),
      trailing: updatedAt != null 
        ? Text(
            _formatTime(DateTime.parse(updatedAt)),
            style: TextStyle(color: fcolor.greyLabel, fontSize: 12),
          )
        : null,
      onTap: () => _openChat(conversation),
    ),
  );
}
```

## Notification System

### Firebase Cloud Messaging Setup

```dart
// File: lib/core/services/notification_service.dart
class NotificationService {
  static Future<void> init() async {
    // Initialize local notifications
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _handleNotificationTap,
    );

    // Request permissions
    await FirebaseMessaging.instance.requestPermission(
      alert: true, 
      badge: true, 
      sound: true
    );

    // Save FCM token
    final token = await FirebaseMessaging.instance.getToken();
    await _saveFcmToken(token);

    // Handle messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
  }

  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    final data = message.data;
    final type = data['type'];

    if (type == 'message') {
      // Show custom chat notification
      _showChatNotification(
        title: message.notification?.title ?? '',
        body: message.notification?.body ?? '',
        conversationId: data['conversationId'],
        senderId: data['senderId'],
        senderName: data['senderName'],
      );
    }
  }

  static Future<void> _showChatNotification({
    required String title,
    required String body,
    required String conversationId,
    required String senderId,
    required String senderName,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'chat_messages',
      'Chat Messages',
      channelDescription: 'Notifications for chat messages',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
    );

    const notificationDetails = NotificationDetails(android: androidDetails);

    await _localNotifications.show(
      conversationId.hashCode,
      title,
      body,
      notificationDetails,
      payload: jsonEncode({
        'type': 'message',
        'conversationId': conversationId,
        'senderId': senderId,
        'senderName': senderName,
      }),
    );
  }

  static Future<void> _handleNotificationTap(NotificationResponse response) async {
    if (response.payload != null) {
      final data = jsonDecode(response.payload!);
      
      if (data['type'] == 'message') {
        // Navigate to chat
        final nav = NavigationService.navigatorKey.currentState;
        nav?.push(MaterialPageRoute(
          builder: (_) => ChatDetailPage(
            otherUserId: data['senderId'],
            otherUserName: data['senderName'],
            conversationId: data['conversationId'],
          ),
        ));
      }
    }
  }
}
```

### Backend Notification Triggers

You'll need to create edge functions or server-side logic to send notifications when messages are inserted:

```typescript
// Supabase Edge Function example
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { record } = await req.json()
  
  // Get conversation details
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      *,
      user1:users!conversations_user1_id_fkey(id, username, fcm_token),
      user2:users!conversations_user2_id_fkey(id, username, fcm_token)
    `)
    .eq('id', record.conversation_id)
    .single()

  if (!conversation) return new Response('Conversation not found', { status: 404 })

  // Determine recipient
  const recipient = record.sender_id === conversation.user1_id 
    ? conversation.user2 
    : conversation.user1

  if (!recipient.fcm_token) return new Response('No FCM token', { status: 400 })

  // Send FCM notification
  const notification = {
    to: recipient.fcm_token,
    notification: {
      title: `Message from ${record.sender_id === conversation.user1_id ? conversation.user1.username : conversation.user2.username}`,
      body: record.content,
    },
    data: {
      type: 'message',
      conversationId: record.conversation_id,
      senderId: record.sender_id,
    }
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(notification),
  })

  return new Response('Notification sent', { status: 200 })
})
```

## Performance Optimizations

### Database Optimizations

1. **Composite Indexes**: Critical for chat queries
```sql
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_user_updated ON conversations(user1_id, user2_id, updated_at DESC);
```

2. **Materialized View for Heavy Queries**:
```sql
CREATE MATERIALIZED VIEW chat_conversations_view AS
SELECT 
  c.id as conversation_id,
  c.user1_id, c.user2_id,
  c.updated_at, c.last_message,
  u1.username as user1_username,
  u1.full_name as user1_full_name,
  u1.avatar_url as user1_avatar_url,
  u1.is_verified as user1_is_verified,
  u2.username as user2_username,
  u2.full_name as user2_full_name,
  u2.avatar_url as user2_avatar_url,
  u2.is_verified as user2_is_verified,
  -- Pre-calculated unread counts
  COALESCE(unread_u1.count, 0) as unread_count_user1,
  COALESCE(unread_u2.count, 0) as unread_count_user2
FROM conversations c
LEFT JOIN users u1 ON c.user1_id = u1.id
LEFT JOIN users u2 ON c.user2_id = u2.id
LEFT JOIN (
  SELECT m.conversation_id, COUNT(*) as count
  FROM messages m
  INNER JOIN conversations conv ON m.conversation_id = conv.id
  WHERE m.is_read = false AND m.sender_id != conv.user1_id
  GROUP BY m.conversation_id
) unread_u1 ON c.id = unread_u1.conversation_id
LEFT JOIN (
  SELECT m.conversation_id, COUNT(*) as count
  FROM messages m  
  INNER JOIN conversations conv ON m.conversation_id = conv.id
  WHERE m.is_read = false AND m.sender_id != conv.user2_id
  GROUP BY m.conversation_id
) unread_u2 ON c.id = unread_u2.conversation_id;

-- Refresh materialized view periodically
CREATE OR REPLACE FUNCTION refresh_chat_conversations_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW chat_conversations_view;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh every 5 minutes (adjust as needed)
SELECT cron.schedule('refresh-chat-view', '*/5 * * * *', 'SELECT refresh_chat_conversations_view();');
```

### Flutter Performance

1. **Pagination**: Load messages in chunks
```dart
static const int messagesPerPage = 20;
bool _isLoadingOlderMessages = false;
bool _hasMoreMessages = true;

Future<void> _loadOlderMessages() async {
  if (_isLoadingOlderMessages || !_hasMoreMessages) return;
  
  setState(() => _isLoadingOlderMessages = true);
  
  try {
    final olderMessages = await loadMessages(
      _conversationId,
      limit: messagesPerPage,
      beforeMessageId: _messages.last['id'],
    );
    
    if (olderMessages.length < messagesPerPage) {
      _hasMoreMessages = false;
    }
    
    setState(() {
      _messages.addAll(olderMessages);
      _isLoadingOlderMessages = false;
    });
  } catch (e) {
    setState(() => _isLoadingOlderMessages = false);
  }
}

// In scroll listener
void _onScroll() {
  if (_scrollController.position.pixels > 
      _scrollController.position.maxScrollExtent - 100) {
    _loadOlderMessages();
  }
}
```

2. **Message Virtualization**: Use ListView.builder for memory efficiency
```dart
ListView.builder(
  controller: _scrollController,
  reverse: true,
  itemCount: _messages.length + (_hasMoreMessages ? 1 : 0),
  itemBuilder: (context, index) {
    if (index == _messages.length) {
      return _buildLoadingIndicator();
    }
    
    final message = _messages[index];
    return AnimationConfiguration.staggeredList(
      position: index,
      child: SlideAnimation(
        verticalOffset: 50.0,
        child: MessageBubble(
          message: message,
          isMe: message['sender_id'] == _currentUserId,
          isRead: message['is_read'] ?? false,
          timestamp: _formatTimestamp(message['created_at']),
          onTap: () => _handleMessageTap(message),
          onLongPress: () => _handleMessageLongPress(message),
        ),
      ),
    );
  },
);
```

## Cache Management

### Flutter Cache Strategy

```dart
// File: lib/core/services/cache_manager.dart (relevant excerpts)
class CacheManager {
  static const Duration _cacheExpiry = Duration(minutes: 2);
  
  // Cache conversations with offline support
  Future<void> cacheConversations(
    List<Map<String, dynamic>> conversations, 
    String userId
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final cacheData = {
      'conversations': conversations,
      'cached_at': DateTime.now().toIso8601String(),
      'user_id': userId,
    };
    
    await prefs.setString(
      'cached_conversations_$userId',
      jsonEncode(cacheData)
    );
  }

  Future<List<Map<String, dynamic>>> getCachedConversations(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final cachedData = prefs.getString('cached_conversations_$userId');
    
    if (cachedData == null) return [];
    
    try {
      final data = jsonDecode(cachedData);
      final cachedAt = DateTime.parse(data['cached_at']);
      
      // Check if cache is still valid
      if (DateTime.now().difference(cachedAt) > _cacheExpiry) {
        return [];
      }
      
      return List<Map<String, dynamic>>.from(data['conversations']);
    } catch (e) {
      return [];
    }
  }

  // Cache messages for offline viewing
  Future<void> cacheMessages(
    List<Map<String, dynamic>> messages,
    String conversationId
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final cacheData = {
      'messages': messages,
      'cached_at': DateTime.now().toIso8601String(),
      'conversation_id': conversationId,
    };
    
    await prefs.setString(
      'cached_messages_$conversationId',
      jsonEncode(cacheData)
    );
  }

  Future<List<Map<String, dynamic>>> getCachedMessages(String conversationId) async {
    final prefs = await SharedPreferences.getInstance();
    final cachedData = prefs.getString('cached_messages_$conversationId');
    
    if (cachedData == null) return [];
    
    try {
      final data = jsonDecode(cachedData);
      final cachedAt = DateTime.parse(data['cached_at']);
      
      if (DateTime.now().difference(cachedAt) > _cacheExpiry) {
        return [];
      }
      
      return List<Map<String, dynamic>>.from(data['messages']);
    } catch (e) {
      return [];
    }
  }

  // Check network connectivity
  Future<bool> hasInternetConnection() async {
    try {
      final result = await InternetAddress.lookup('google.com');
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      return false;
    }
  }
}
```

## Next.js Implementation Guide

### Setup and Dependencies

```bash
npm install @supabase/supabase-js
npm install @supabase/realtime-js
npm install react-query # or @tanstack/react-query
npm install date-fns # for date formatting
```

### Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database type definitions
export interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  last_message: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  reply_to_id?: string
  message_type: 'text' | 'image' | 'video'
  media_url?: string
  created_at: string
  read_at?: string
  is_read: boolean
}

export interface ChatCategory {
  id: string
  user_id: string
  name: string
  color?: string
  created_at: string
  updated_at: string
}
```

### React Hooks for Chat

```typescript
// hooks/useConversations.ts
import { useQuery, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'

export const useConversations = (userId: string) => {
  const queryClient = useQueryClient()

  return useQuery(['conversations', userId], async () => {
    const { data, error } = await supabase
      .rpc('get_user_conversations', { user_uuid: userId })

    if (error) throw error
    return data
  }, {
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  })
}

// hooks/useMessages.ts  
export const useMessages = (conversationId: string) => {
  return useQuery(['messages', conversationId], async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        reply_to:reply_to_id(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data.reverse()
  }, {
    enabled: !!conversationId,
  })
}

// hooks/useRealtime.ts
export const useRealtimeMessages = (
  conversationId: string, 
  onNewMessage: (message: Message) => void
) => {
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onNewMessage(payload.new as Message)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, onNewMessage])
}
```

### React Components

```typescript
// components/ChatList.tsx
import React from 'react'
import { useConversations } from '../hooks/useConversations'
import { useUser } from '../hooks/useAuth'
import { ConversationItem } from './ConversationItem'

export const ChatList: React.FC = () => {
  const { user } = useUser()
  const { data: conversations, isLoading } = useConversations(user?.id || '')

  if (isLoading) {
    return <div>Loading conversations...</div>
  }

  return (
    <div className="chat-list">
      {conversations?.map((conversation) => (
        <ConversationItem
          key={conversation.conversation_id}
          conversation={conversation}
          currentUserId={user?.id}
        />
      ))}
    </div>
  )
}

// components/ConversationItem.tsx
interface ConversationItemProps {
  conversation: any
  currentUserId: string
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUserId
}) => {
  const unreadCount = conversation.unread_count || 0

  return (
    <div 
      className={`conversation-item ${unreadCount > 0 ? 'unread' : ''}`}
      onClick={() => router.push(`/chat/${conversation.conversation_id}`)}
    >
      <div className="avatar">
        <img 
          src={conversation.other_avatar_url || '/default-avatar.png'}
          alt={conversation.other_username}
        />
      </div>
      
      <div className="conversation-content">
        <div className="header">
          <span className="username">
            {conversation.other_username}
            {conversation.other_is_verified && (
              <span className="verified-badge">✓</span>
            )}
          </span>
          <span className="timestamp">
            {formatTime(conversation.updated_at)}
          </span>
        </div>
        
        <div className="last-message">
          {conversation.last_message}
        </div>
      </div>
      
      {unreadCount > 0 && (
        <div className="unread-badge">
          {unreadCount}
        </div>
      )}
    </div>
  )
}

// components/ChatDetail.tsx
export const ChatDetail: React.FC<{ conversationId: string }> = ({ 
  conversationId 
}) => {
  const { user } = useUser()
  const { data: messages } = useMessages(conversationId)
  const [newMessage, setNewMessage] = useState('')
  const queryClient = useQueryClient()

  // Handle real-time updates
  useRealtimeMessages(conversationId, (message) => {
    queryClient.setQueryData(['messages', conversationId], (old: Message[] | undefined) => {
      if (!old) return [message]
      return [...old, message]
    })

    // Mark as read if user is viewing
    if (message.sender_id !== user?.id) {
      markAsRead(message.id)
    }
  })

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user?.id,
        content: newMessage.trim(),
        is_read: false,
      })

    if (!error) {
      setNewMessage('')
    }
  }

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', messageId)
      .eq('sender_id', user?.id) // Only sender can mark as read
  }

  return (
    <div className="chat-detail">
      <div className="messages-container">
        {messages?.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isMe={message.sender_id === user?.id}
            isRead={message.is_read}
          />
        ))}
      </div>

      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage} disabled={!newMessage.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

// components/MessageBubble.tsx
interface MessageBubbleProps {
  message: Message
  isMe: boolean
  isRead: boolean
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  isRead
}) => {
  return (
    <div className={`message-bubble ${isMe ? 'me' : 'other'}`}>
      <div className="message-content">
        {message.reply_to_id && (
          <div className="reply-preview">
            {/* Reply content */}
          </div>
        )}
        
        <div className="message-text">
          {message.content}
        </div>
        
        <div className="message-footer">
          <span className="timestamp">
            {formatTime(message.created_at)}
          </span>
          {isMe && (
            <span className={`read-status ${isRead ? 'read' : 'sent'}`}>
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

### API Routes (Next.js)

```typescript
// pages/api/chat/unread-count.ts
import { supabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.query

  try {
    const { data, error } = await supabase
      .rpc('get_unread_message_count', { user_id: userId })

    if (error) throw error

    res.status(200).json({ unreadCount: data })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get unread count' })
  }
}

// pages/api/chat/send-message.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { conversationId, content, senderId, replyToId, messageType, mediaUrl } = req.body

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        reply_to_id: replyToId,
        message_type: messageType || 'text',
        media_url: mediaUrl,
        is_read: false,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ message: data })
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' })
  }
}
```

### CSS Styles

```css
/* styles/chat.css */
.chat-list {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conversation-item:hover {
  background-color: #f5f5f5;
}

.conversation-item.unread {
  background-color: #f0f8ff;
  font-weight: 600;
}

.avatar img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.conversation-content {
  flex: 1;
  margin-left: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.username {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.verified-badge {
  color: #1da1f2;
  font-size: 0.8rem;
}

.timestamp {
  font-size: 0.75rem;
  color: #666;
}

.last-message {
  color: #888;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-badge {
  background-color: #1db954;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

/* Chat Detail Styles */
.chat-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-bubble {
  display: flex;
  margin-bottom: 1rem;
}

.message-bubble.me {
  justify-content: flex-end;
}

.message-bubble.other {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  position: relative;
}

.message-bubble.me .message-content {
  background-color: #1db954;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message-bubble.other .message-content {
  background-color: #f1f1f1;
  color: #333;
  border-bottom-left-radius: 0.25rem;
}

.reply-preview {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  border-left: 3px solid currentColor;
}

.message-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.timestamp {
  font-size: 0.7rem;
  opacity: 0.7;
}

.read-status {
  font-size: 0.7rem;
}

.read-status.read {
  color: #1db954;
}

.message-input {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid #eee;
  background-color: white;
}

.message-input input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 2rem;
  outline: none;
}

.message-input input:focus {
  border-color: #1db954;
}

.message-input button {
  padding: 0.75rem 1.5rem;
  background-color: #1db954;
  color: white;
  border: none;
  border-radius: 2rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.message-input button:hover:not(:disabled) {
  background-color: #1aa446;
}

.message-input button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
```

### Utility Functions

```typescript
// utils/dateFormat.ts
import { format, isToday, isYesterday, differenceInDays } from 'date-fns'

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  
  if (isToday(date)) {
    return format(date, 'h:mm a')
  }
  
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  
  if (differenceInDays(new Date(), date) < 7) {
    return format(date, 'EEEE') // Day name
  }
  
  return format(date, 'MM/dd/yy')
}

export const formatMessageTimestamp = (dateString: string): string => {
  const date = new Date(dateString)
  return format(date, 'h:mm a')
}
```

This comprehensive documentation provides everything needed to understand and implement the Flutter messaging system in a Next.js application, including all database schemas, real-time functionality, caching strategies, and UI components.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze messaging database schema and migrations", "status": "completed", "activeForm": "Analyzing messaging database schema and migrations"}, {"content": "Examine chat models, repositories, and data layer", "status": "completed", "activeForm": "Examining chat models, repositories, and data layer"}, {"content": "Review chat UI components and pages", "status": "completed", "activeForm": "Reviewing chat UI components and pages"}, {"content": "Document database functions and RPC calls", "status": "completed", "activeForm": "Documenting database functions and RPC calls"}, {"content": "Create comprehensive messaging system documentation", "status": "completed", "activeForm": "Creating comprehensive messaging system documentation"}]