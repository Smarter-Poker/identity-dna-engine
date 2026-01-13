-- ═══════════════════════════════════════════════════════════════════════════
-- 💬 SOCIAL MESSAGING SYSTEM WITH READ RECEIPTS
-- schemas/supabase_migrations/023_social_messaging_complete.sql
-- 
-- Complete messaging system including conversations, participants,
-- messages, read receipts, and real-time subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 📋 CONVERSATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Conversation type
    conversation_type TEXT DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),
    
    -- Group info (optional)
    group_name TEXT,
    group_avatar_url TEXT,
    
    -- Last activity tracking
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    last_message_sender_id UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_conversations_last_message 
    ON social_conversations(last_message_at DESC);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE social_conversations;

-- ═══════════════════════════════════════════════════════════════════════════
-- 👥 CONVERSATION PARTICIPANTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES social_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Participant settings
    is_admin BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    nickname TEXT,
    
    -- Read tracking
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count INT DEFAULT 0 CHECK (unread_count >= 0),
    
    -- Status
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_conv_participants_user 
    ON social_conversation_participants(user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_conv_participants_conv 
    ON social_conversation_participants(conversation_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_conv_participants_unread 
    ON social_conversation_participants(user_id, unread_count) WHERE unread_count > 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- 💬 MESSAGES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES social_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'sticker', 'system')),
    
    -- Media attachments
    media_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Reply/thread support
    reply_to_id UUID REFERENCES social_messages(id) ON DELETE SET NULL,
    
    -- Reactions
    reactions JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_messages_conversation 
    ON social_messages(conversation_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_messages_sender 
    ON social_messages(sender_id);

-- Enable real-time for messages
ALTER PUBLICATION supabase_realtime ADD TABLE social_messages;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MESSAGE READ RECEIPTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES social_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Read timestamp
    read_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one read per user per message
    UNIQUE(message_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_message_reads_message 
    ON social_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_social_message_reads_user 
    ON social_message_reads(user_id, read_at DESC);

-- Enable real-time for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE social_message_reads;

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚙️ MESSAGING SETTINGS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_messaging_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Display settings
    show_read_receipts BOOLEAN DEFAULT TRUE,
    show_typing_indicator BOOLEAN DEFAULT TRUE,
    show_active_status BOOLEAN DEFAULT TRUE,
    
    -- Notification settings
    message_notifications BOOLEAN DEFAULT TRUE,
    notification_sound BOOLEAN DEFAULT TRUE,
    notification_preview BOOLEAN DEFAULT TRUE,
    
    -- Privacy settings
    allow_message_requests BOOLEAN DEFAULT TRUE,
    allow_message_requests_from TEXT DEFAULT 'everyone' 
        CHECK (allow_message_requests_from IN ('everyone', 'friends', 'nobody')),
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messaging_settings ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see conversations they're in
CREATE POLICY "Users can view their conversations"
ON social_conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM social_conversation_participants p
        WHERE p.conversation_id = social_conversations.id
        AND p.user_id = auth.uid()
        AND p.left_at IS NULL
    )
);

CREATE POLICY "Users can create conversations"
ON social_conversations FOR INSERT
WITH CHECK (TRUE); -- Controlled by function

-- Participants: Users can see participants in their conversations
CREATE POLICY "Users can view conversation participants"
ON social_conversation_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM social_conversation_participants p
        WHERE p.conversation_id = social_conversation_participants.conversation_id
        AND p.user_id = auth.uid()
        AND p.left_at IS NULL
    )
);

CREATE POLICY "Users can join conversations"
ON social_conversation_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participant settings"
ON social_conversation_participants FOR UPDATE
USING (auth.uid() = user_id);

-- Messages: Users can see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON social_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM social_conversation_participants p
        WHERE p.conversation_id = social_messages.conversation_id
        AND p.user_id = auth.uid()
        AND p.left_at IS NULL
    )
    AND is_deleted = FALSE
);

CREATE POLICY "Users can send messages"
ON social_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM social_conversation_participants p
        WHERE p.conversation_id = social_messages.conversation_id
        AND p.user_id = auth.uid()
        AND p.left_at IS NULL
    )
);

CREATE POLICY "Users can edit their own messages"
ON social_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Read receipts: Users can see reads in their conversations
CREATE POLICY "Users can view read receipts in their conversations"
ON social_message_reads FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM social_messages m
        JOIN social_conversation_participants p ON p.conversation_id = m.conversation_id
        WHERE m.id = social_message_reads.message_id
        AND p.user_id = auth.uid()
        AND p.left_at IS NULL
    )
);

CREATE POLICY "Users can mark messages as read"
ON social_message_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Settings: Users can only access their own settings
CREATE POLICY "Users can view their own settings"
ON social_messaging_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON social_messaging_settings FOR ALL
USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get or create a direct conversation between two users
CREATE OR REPLACE FUNCTION fn_get_or_create_conversation(
    p_user_id UUID,
    p_other_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Check for existing direct conversation
    SELECT c.id INTO v_conversation_id
    FROM social_conversations c
    WHERE c.conversation_type = 'direct'
    AND EXISTS (
        SELECT 1 FROM social_conversation_participants p1
        WHERE p1.conversation_id = c.id AND p1.user_id = p_user_id AND p1.left_at IS NULL
    )
    AND EXISTS (
        SELECT 1 FROM social_conversation_participants p2
        WHERE p2.conversation_id = c.id AND p2.user_id = p_other_user_id AND p2.left_at IS NULL
    )
    LIMIT 1;
    
    -- Create if doesn't exist
    IF v_conversation_id IS NULL THEN
        INSERT INTO social_conversations (conversation_type)
        VALUES ('direct')
        RETURNING id INTO v_conversation_id;
        
        -- Add both participants
        INSERT INTO social_conversation_participants (conversation_id, user_id)
        VALUES 
            (v_conversation_id, p_user_id),
            (v_conversation_id, p_other_user_id);
    END IF;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send a message
CREATE OR REPLACE FUNCTION fn_send_message(
    p_conversation_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_media_urls JSONB DEFAULT '[]'::jsonb,
    p_reply_to_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
    v_sender_id UUID;
BEGIN
    v_sender_id := auth.uid();
    
    -- Verify user is in conversation
    IF NOT EXISTS (
        SELECT 1 FROM social_conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = v_sender_id
        AND left_at IS NULL
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;
    
    -- Insert message
    INSERT INTO social_messages (
        conversation_id, sender_id, content, message_type, media_urls, reply_to_id
    )
    VALUES (
        p_conversation_id, v_sender_id, p_content, p_message_type, p_media_urls, p_reply_to_id
    )
    RETURNING id INTO v_message_id;
    
    -- Update conversation last message
    UPDATE social_conversations
    SET 
        last_message_at = NOW(),
        last_message_preview = LEFT(p_content, 100),
        last_message_sender_id = v_sender_id,
        updated_at = NOW()
    WHERE id = p_conversation_id;
    
    -- Increment unread count for other participants
    UPDATE social_conversation_participants
    SET unread_count = unread_count + 1
    WHERE conversation_id = p_conversation_id
    AND user_id != v_sender_id
    AND left_at IS NULL;
    
    -- Auto-mark as read for sender
    INSERT INTO social_message_reads (message_id, user_id)
    VALUES (v_message_id, v_sender_id)
    ON CONFLICT (message_id, user_id) DO NOTHING;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark messages as read
CREATE OR REPLACE FUNCTION fn_mark_messages_read(
    p_conversation_id UUID
)
RETURNS INT AS $$
DECLARE
    v_user_id UUID;
    v_count INT;
BEGIN
    v_user_id := auth.uid();
    
    -- Insert read receipts for all unread messages
    INSERT INTO social_message_reads (message_id, user_id)
    SELECT m.id, v_user_id
    FROM social_messages m
    WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != v_user_id
    AND m.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM social_message_reads r
        WHERE r.message_id = m.id AND r.user_id = v_user_id
    )
    ON CONFLICT (message_id, user_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Reset unread count
    UPDATE social_conversation_participants
    SET 
        unread_count = 0,
        last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's conversations with unread counts
CREATE OR REPLACE FUNCTION fn_get_user_conversations(
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    conversation_id UUID,
    conversation_type TEXT,
    group_name TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_sender_id UUID,
    unread_count INT,
    other_participant_id UUID,
    other_participant_username TEXT,
    other_participant_avatar TEXT,
    other_participant_online BOOLEAN
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        c.conversation_type,
        c.group_name,
        c.last_message_at,
        c.last_message_preview,
        c.last_message_sender_id,
        p.unread_count,
        other_p.user_id as other_participant_id,
        u.username as other_participant_username,
        u.avatar_url as other_participant_avatar,
        TRUE as other_participant_online -- Placeholder for presence
    FROM social_conversations c
    JOIN social_conversation_participants p 
        ON p.conversation_id = c.id AND p.user_id = v_user_id AND p.left_at IS NULL
    LEFT JOIN social_conversation_participants other_p 
        ON other_p.conversation_id = c.id 
        AND other_p.user_id != v_user_id 
        AND other_p.left_at IS NULL
        AND c.conversation_type = 'direct'
    LEFT JOIN user_dna_profiles u ON u.user_id = other_p.user_id
    ORDER BY c.last_message_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get messages for a conversation
CREATE OR REPLACE FUNCTION fn_get_conversation_messages(
    p_conversation_id UUID,
    p_limit INT DEFAULT 50,
    p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    sender_username TEXT,
    sender_avatar TEXT,
    content TEXT,
    message_type TEXT,
    media_urls JSONB,
    reply_to_id UUID,
    reactions JSONB,
    is_edited BOOLEAN,
    created_at TIMESTAMPTZ,
    read_by JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        u.username as sender_username,
        u.avatar_url as sender_avatar,
        m.content,
        m.message_type,
        m.media_urls,
        m.reply_to_id,
        m.reactions,
        m.is_edited,
        m.created_at,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'user_id', r.user_id,
                'read_at', r.read_at
            ))
            FROM social_message_reads r
            WHERE r.message_id = m.id
            ), '[]'::jsonb
        ) as read_by
    FROM social_messages m
    LEFT JOIN user_dna_profiles u ON u.user_id = m.sender_id
    WHERE m.conversation_id = p_conversation_id
    AND m.is_deleted = FALSE
    AND (p_before_id IS NULL OR m.created_at < (
        SELECT created_at FROM social_messages WHERE id = p_before_id
    ))
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   💬 SOCIAL MESSAGING SYSTEM — DEPLOYED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Table: social_conversations              ✅ CREATED';
    RAISE NOTICE '   Table: social_conversation_participants  ✅ CREATED';
    RAISE NOTICE '   Table: social_messages                   ✅ CREATED';
    RAISE NOTICE '   Table: social_message_reads              ✅ CREATED';
    RAISE NOTICE '   Table: social_messaging_settings         ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_or_create_conversation  ✅ CREATED';
    RAISE NOTICE '   Function: fn_send_message                ✅ CREATED';
    RAISE NOTICE '   Function: fn_mark_messages_read          ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_user_conversations      ✅ CREATED';
    RAISE NOTICE '   Function: fn_get_conversation_messages   ✅ CREATED';
    RAISE NOTICE '   RLS Policies                             🔐 ENABLED';
    RAISE NOTICE '   Real-Time Subscriptions                  ⚡ ACTIVE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
