/**
 * 💬 MESSAGING SERVICE
 * src/app/social/MessagingService.js
 * 
 * Complete messaging functionality with real-time subscriptions,
 * read receipts, and typing indicators.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 💬 MESSAGING SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class MessagingService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.realtimeChannels = new Map();
        this.typingTimeouts = new Map();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 📋 CONVERSATION OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get user's conversations
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async getConversations({ limit = 20, offset = 0 } = {}) {
        try {
            const { data, error } = await this.supabase.rpc('fn_get_user_conversations', {
                p_limit: limit,
                p_offset: offset
            });

            if (error) throw error;

            return data.map(conv => ({
                id: conv.conversation_id,
                type: conv.conversation_type,
                groupName: conv.group_name,
                lastMessageAt: conv.last_message_at,
                lastMessagePreview: conv.last_message_preview,
                lastMessageSenderId: conv.last_message_sender_id,
                unreadCount: conv.unread_count,
                participant: conv.other_participant_id ? {
                    id: conv.other_participant_id,
                    username: conv.other_participant_username,
                    avatar: conv.other_participant_avatar,
                    online: conv.other_participant_online
                } : null
            }));
        } catch (error) {
            console.error('Get conversations error:', error);
            throw error;
        }
    }

    /**
     * Get or create a direct conversation
     * @param {string} otherUserId - User to chat with
     * @returns {Promise<string>} - Conversation ID
     */
    async getOrCreateDirectConversation(otherUserId) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await this.supabase.rpc('fn_get_or_create_conversation', {
                p_user_id: user.id,
                p_other_user_id: otherUserId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get/create conversation error:', error);
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 💬 MESSAGE OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get messages for a conversation
     * @param {string} conversationId - Conversation UUID
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async getMessages(conversationId, { limit = 50, beforeId = null } = {}) {
        try {
            const { data, error } = await this.supabase.rpc('fn_get_conversation_messages', {
                p_conversation_id: conversationId,
                p_limit: limit,
                p_before_id: beforeId
            });

            if (error) throw error;

            // Reverse to get chronological order
            return data.reverse().map(msg => ({
                id: msg.message_id,
                senderId: msg.sender_id,
                senderUsername: msg.sender_username,
                senderAvatar: msg.sender_avatar,
                content: msg.content,
                type: msg.message_type,
                mediaUrls: msg.media_urls,
                replyToId: msg.reply_to_id,
                reactions: msg.reactions,
                isEdited: msg.is_edited,
                createdAt: msg.created_at,
                readBy: msg.read_by
            }));
        } catch (error) {
            console.error('Get messages error:', error);
            throw error;
        }
    }

    /**
     * Send a message
     * @param {Object} options - Message options
     * @returns {Promise<string>} - Message ID
     */
    async sendMessage({ conversationId, content, type = 'text', mediaUrls = [], replyToId = null }) {
        try {
            const { data, error } = await this.supabase.rpc('fn_send_message', {
                p_conversation_id: conversationId,
                p_content: content,
                p_message_type: type,
                p_media_urls: mediaUrls,
                p_reply_to_id: replyToId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Send message error:', error);
            throw error;
        }
    }

    /**
     * Edit a message
     * @param {string} messageId - Message UUID
     * @param {string} newContent - New content
     * @returns {Promise<boolean>}
     */
    async editMessage(messageId, newContent) {
        try {
            const { error } = await this.supabase
                .from('social_messages')
                .update({
                    content: newContent,
                    is_edited: true,
                    edited_at: new Date().toISOString()
                })
                .eq('id', messageId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Edit message error:', error);
            throw error;
        }
    }

    /**
     * Delete a message (soft delete)
     * @param {string} messageId - Message UUID
     * @returns {Promise<boolean>}
     */
    async deleteMessage(messageId) {
        try {
            const { error } = await this.supabase
                .from('social_messages')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString()
                })
                .eq('id', messageId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete message error:', error);
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ✅ READ RECEIPTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Mark messages as read
     * @param {string} conversationId - Conversation UUID
     * @returns {Promise<number>} - Number of messages marked as read
     */
    async markAsRead(conversationId) {
        try {
            const { data, error } = await this.supabase.rpc('fn_mark_messages_read', {
                p_conversation_id: conversationId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Mark as read error:', error);
            throw error;
        }
    }

    /**
     * Get read receipts for a message
     * @param {string} messageId - Message UUID
     * @returns {Promise<Array>}
     */
    async getReadReceipts(messageId) {
        try {
            const { data, error } = await this.supabase
                .from('social_message_reads')
                .select(`
                    user_id,
                    read_at,
                    user:user_dna_profiles!user_id (
                        username,
                        avatar_url
                    )
                `)
                .eq('message_id', messageId);

            if (error) throw error;

            return data.map(read => ({
                userId: read.user_id,
                readAt: read.read_at,
                username: read.user?.username,
                avatar: read.user?.avatar_url
            }));
        } catch (error) {
            console.error('Get read receipts error:', error);
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ⚙️ SETTINGS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get messaging settings
     * @returns {Promise<Object>}
     */
    async getSettings() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await this.supabase
                .from('social_messaging_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return data || {
                showReadReceipts: true,
                showTypingIndicator: true,
                showActiveStatus: true,
                messageNotifications: true,
                notificationSound: true,
                notificationPreview: true,
                allowMessageRequests: true,
                allowMessageRequestsFrom: 'everyone'
            };
        } catch (error) {
            console.error('Get settings error:', error);
            return null;
        }
    }

    /**
     * Update messaging settings
     * @param {Object} settings - Settings to update
     * @returns {Promise<boolean>}
     */
    async updateSettings(settings) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await this.supabase
                .from('social_messaging_settings')
                .upsert({
                    user_id: user.id,
                    show_read_receipts: settings.showReadReceipts,
                    show_typing_indicator: settings.showTypingIndicator,
                    show_active_status: settings.showActiveStatus,
                    message_notifications: settings.messageNotifications,
                    notification_sound: settings.notificationSound,
                    notification_preview: settings.notificationPreview,
                    allow_message_requests: settings.allowMessageRequests,
                    allow_message_requests_from: settings.allowMessageRequestsFrom,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Update settings error:', error);
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ⚡ REAL-TIME SUBSCRIPTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Subscribe to new messages in a conversation
     * @param {string} conversationId - Conversation UUID
     * @param {Object} callbacks - Callback functions
     * @returns {Function} - Unsubscribe function
     */
    subscribeToMessages(conversationId, { onNewMessage, onMessageUpdate, onReadReceipt }) {
        const channelKey = `messages:${conversationId}`;

        // Remove existing subscription
        if (this.realtimeChannels.has(channelKey)) {
            this.realtimeChannels.get(channelKey).unsubscribe();
        }

        const channel = this.supabase
            .channel(channelKey)
            // New messages
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'social_messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                async (payload) => {
                    // Fetch complete message with user info
                    const messages = await this.getMessages(conversationId, { limit: 1 });
                    const newMsg = messages.find(m => m.id === payload.new.id);
                    if (newMsg && onNewMessage) {
                        onNewMessage(newMsg);
                    }
                }
            )
            // Message updates
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'social_messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    if (onMessageUpdate) {
                        onMessageUpdate(payload.new);
                    }
                }
            )
            // Read receipts
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'social_message_reads'
                },
                (payload) => {
                    if (onReadReceipt) {
                        onReadReceipt(payload.new);
                    }
                }
            )
            .subscribe();

        this.realtimeChannels.set(channelKey, channel);

        return () => {
            channel.unsubscribe();
            this.realtimeChannels.delete(channelKey);
        };
    }

    /**
     * Subscribe to all conversations for new messages
     * @param {Function} onConversationUpdate - Callback for updates
     * @returns {Function} - Unsubscribe function
     */
    subscribeToConversations(onConversationUpdate) {
        const channelKey = 'conversations:all';

        if (this.realtimeChannels.has(channelKey)) {
            this.realtimeChannels.get(channelKey).unsubscribe();
        }

        const channel = this.supabase
            .channel(channelKey)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'social_conversations'
                },
                (payload) => {
                    if (onConversationUpdate) {
                        onConversationUpdate(payload.new);
                    }
                }
            )
            .subscribe();

        this.realtimeChannels.set(channelKey, channel);

        return () => {
            channel.unsubscribe();
            this.realtimeChannels.delete(channelKey);
        };
    }

    /**
     * Broadcast typing indicator
     * @param {string} conversationId - Conversation UUID
     */
    async sendTypingIndicator(conversationId) {
        const channelKey = `typing:${conversationId}`;

        // Get or create channel
        let channel = this.realtimeChannels.get(channelKey);
        if (!channel) {
            channel = this.supabase.channel(channelKey);
            await channel.subscribe();
            this.realtimeChannels.set(channelKey, channel);
        }

        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) return;

        channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
                userId: user.id,
                conversationId,
                timestamp: Date.now()
            }
        });
    }

    /**
     * Subscribe to typing indicators
     * @param {string} conversationId - Conversation UUID
     * @param {Function} onTyping - Callback for typing events
     * @returns {Function} - Unsubscribe function
     */
    subscribeToTyping(conversationId, onTyping) {
        const channelKey = `typing:${conversationId}`;

        let channel = this.realtimeChannels.get(channelKey);
        if (!channel) {
            channel = this.supabase.channel(channelKey);
            this.realtimeChannels.set(channelKey, channel);
        }

        channel
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (onTyping) {
                    onTyping(payload.payload);
                }
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
            this.realtimeChannels.delete(channelKey);
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 🧹 CLEANUP
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Clean up all subscriptions
     */
    cleanup() {
        this.realtimeChannels.forEach(channel => {
            channel.unsubscribe();
        });
        this.realtimeChannels.clear();

        this.typingTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });
        this.typingTimeouts.clear();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export function createMessagingService(supabaseClient) {
    return new MessagingService(supabaseClient);
}

export default MessagingService;
