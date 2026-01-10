/**
 * 🧬 IDENTITY_DNA_ENGINE — Master Bus Connector
 * 
 * Connects to the Pentagon Enforcer (TCP bus on PORT 4000)
 * for cross-engine orchestration via the Yellow Window.
 */

import { EventEmitter } from 'events';
import net from 'net';

// ═══════════════════════════════════════════════════════════════════════════
// 🚌 MASTER BUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const BUS_CONFIG = {
    host: process.env.MASTER_BUS_HOST || '127.0.0.1',
    port: parseInt(process.env.MASTER_BUS_PORT || '4000'),
    reconnectDelay: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    messageDelimiter: '\n'
};

// ═══════════════════════════════════════════════════════════════════════════
// 📡 MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════
export const BUS_MESSAGE_TYPES = {
    // System
    HANDSHAKE: 'HANDSHAKE',
    HEARTBEAT: 'HEARTBEAT',
    ACK: 'ACK',

    // Identity Operations
    PROFILE_UPDATE: 'PROFILE_UPDATE',
    DNA_SYNC: 'DNA_SYNC',
    TRUST_UPDATE: 'TRUST_UPDATE',

    // Cross-Orb Events
    PLAYER_ACTION: 'PLAYER_ACTION',
    XP_AWARDED: 'XP_AWARDED',
    BADGE_EARNED: 'BADGE_EARNED',
    TIER_CHANGED: 'TIER_CHANGED'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🚌 MASTER BUS CONNECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class MasterBusConnector extends EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.heartbeatTimer = null;
        this.messageBuffer = '';
        this.pendingMessages = new Map();
        this.messageId = 0;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔗 CONNECTION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Connect to Master Bus (Pentagon Enforcer)
     */
    async connect() {
        return new Promise((resolve, reject) => {
            console.log(`🚌 Connecting to Master Bus at ${BUS_CONFIG.host}:${BUS_CONFIG.port}...`);

            this.socket = net.createConnection({
                host: BUS_CONFIG.host,
                port: BUS_CONFIG.port
            });

            this.socket.on('connect', () => {
                this.connected = true;
                this.reconnectAttempts = 0;
                console.log('✅ Master Bus connected');

                // Send handshake
                this.sendHandshake();

                // Start heartbeat
                this.startHeartbeat();

                this.emit('connected');
                resolve();
            });

            this.socket.on('data', (data) => {
                this.handleData(data);
            });

            this.socket.on('error', (error) => {
                console.error('❌ Master Bus error:', error.message);
                this.emit('error', error);

                if (!this.connected) {
                    reject(error);
                }
            });

            this.socket.on('close', () => {
                this.connected = false;
                this.stopHeartbeat();
                console.log('🔌 Master Bus disconnected');
                this.emit('disconnected');

                // Attempt reconnection
                this.attemptReconnect();
            });

            // Timeout for initial connection
            setTimeout(() => {
                if (!this.connected) {
                    this.socket?.destroy();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Attempt to reconnect after disconnection
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= BUS_CONFIG.maxReconnectAttempts) {
            console.error('❌ Max reconnect attempts reached');
            this.emit('maxReconnectsReached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting to Master Bus (attempt ${this.reconnectAttempts})...`);

        setTimeout(() => {
            this.connect().catch(() => {
                // Will retry in the close handler
            });
        }, BUS_CONFIG.reconnectDelay);
    }

    /**
     * Disconnect from Master Bus
     */
    disconnect() {
        this.stopHeartbeat();

        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }

        this.connected = false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 💓 HEARTBEAT
    // ═══════════════════════════════════════════════════════════════════

    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.connected) {
                this.send({
                    type: BUS_MESSAGE_TYPES.HEARTBEAT,
                    timestamp: Date.now(),
                    engine: 'IDENTITY_DNA_ENGINE'
                });
            }
        }, BUS_CONFIG.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📤 SENDING MESSAGES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Send handshake to register with Master Bus
     */
    sendHandshake() {
        this.send({
            type: BUS_MESSAGE_TYPES.HANDSHAKE,
            engine: 'IDENTITY_DNA_ENGINE',
            version: '1.0.0',
            capabilities: [
                'PROFILE_MANAGEMENT',
                'TRUST_SCORING',
                'SKILL_TIER',
                'XP_SYNC',
                'BADGE_AGGREGATION'
            ],
            subscribeTo: [
                'PLAYER_ACTION',
                'XP_AWARDED',
                'BADGE_EARNED'
            ]
        });
    }

    /**
     * Send a message to the Master Bus
     */
    send(message) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot send: Not connected to Master Bus');
            return false;
        }

        const messageId = ++this.messageId;
        const envelope = {
            id: messageId,
            source: 'IDENTITY_DNA_ENGINE',
            timestamp: Date.now(),
            ...message
        };

        const data = JSON.stringify(envelope) + BUS_CONFIG.messageDelimiter;

        try {
            this.socket.write(data);
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }

    /**
     * Send and wait for acknowledgment
     */
    async sendAndWait(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const messageId = ++this.messageId;

            const timer = setTimeout(() => {
                this.pendingMessages.delete(messageId);
                reject(new Error('Message timeout'));
            }, timeout);

            this.pendingMessages.set(messageId, {
                resolve: (response) => {
                    clearTimeout(timer);
                    this.pendingMessages.delete(messageId);
                    resolve(response);
                },
                reject
            });

            this.send({ ...message, id: messageId, expectAck: true });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📥 RECEIVING MESSAGES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Handle incoming data from socket
     */
    handleData(data) {
        this.messageBuffer += data.toString();

        // Process complete messages (delimited by newline)
        const messages = this.messageBuffer.split(BUS_CONFIG.messageDelimiter);
        this.messageBuffer = messages.pop() || ''; // Keep incomplete message

        for (const msgStr of messages) {
            if (msgStr.trim()) {
                try {
                    const message = JSON.parse(msgStr);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse message:', error);
                }
            }
        }
    }

    /**
     * Handle parsed message
     */
    handleMessage(message) {
        const { type, id } = message;

        // Check for pending request response
        if (id && this.pendingMessages.has(id)) {
            const pending = this.pendingMessages.get(id);
            pending.resolve(message);
            return;
        }

        // Handle by type
        switch (type) {
            case BUS_MESSAGE_TYPES.ACK:
                // Already handled above
                break;

            case BUS_MESSAGE_TYPES.HEARTBEAT:
                // Respond to heartbeat
                this.send({ type: BUS_MESSAGE_TYPES.ACK, replyTo: id });
                break;

            case BUS_MESSAGE_TYPES.PLAYER_ACTION:
            case BUS_MESSAGE_TYPES.XP_AWARDED:
            case BUS_MESSAGE_TYPES.BADGE_EARNED:
                // Emit for SyncOrchestrator to handle
                this.emit(type, message);
                break;

            default:
                // Emit generic message event
                this.emit('message', message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📡 PUBLISHING EVENTS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Publish a DNA update to all interested Orbs
     */
    publishDNAUpdate(userId, updates) {
        return this.send({
            type: BUS_MESSAGE_TYPES.DNA_SYNC,
            userId,
            updates,
            broadcast: true
        });
    }

    /**
     * Publish tier change notification
     */
    publishTierChange(userId, oldTier, newTier) {
        return this.send({
            type: BUS_MESSAGE_TYPES.TIER_CHANGED,
            userId,
            oldTier,
            newTier,
            broadcast: true
        });
    }

    /**
     * Publish trust update notification
     */
    publishTrustUpdate(userId, trustScore) {
        return this.send({
            type: BUS_MESSAGE_TYPES.TRUST_UPDATE,
            userId,
            trustScore,
            broadcast: true
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📊 STATUS
    // ═══════════════════════════════════════════════════════════════════

    getStatus() {
        return {
            connected: this.connected,
            host: BUS_CONFIG.host,
            port: BUS_CONFIG.port,
            reconnectAttempts: this.reconnectAttempts,
            pendingMessages: this.pendingMessages.size
        };
    }

    async ping() {
        if (!this.connected) return false;

        try {
            await this.sendAndWait({ type: 'PING' }, 3000);
            return true;
        } catch {
            return false;
        }
    }
}
