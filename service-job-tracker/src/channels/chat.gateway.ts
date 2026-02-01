import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true
    },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    afterInit(server: Server) {
        console.log('[ChatGateway] Initialized');
    }

    handleConnection(client: Socket) {
        console.log(`[ChatGateway] Client connected: ${client.id}`);
        // Extract userId from query params
        const userId = client.handshake.query.userId;
        if (userId) {
            const roomName = `user_${userId}`;
            client.join(roomName);
            console.log(`[ChatGateway] Client ${client.id} joined room: ${roomName}`);
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`[ChatGateway] Client disconnected: ${client.id}`);
    }

    // Method to broadcast a message to all clients
    broadcastMessage(message: any) {
        this.server.emit('message', message);
    }

    broadcastChannelDeleted(channelId: number) {
        this.server.emit('channel_deleted', { id: channelId });
    }

    broadcastMessageDeleted(messageId: number, channelId: number) {
        this.server.emit('message_deleted', { messageId, channelId });
    }

    broadcastMessageUpdated(message: any) {
        this.server.emit('message_updated', message);
    }

    broadcastChannelCreated(channel: any) {
        this.server.emit('channel_created', channel);
    }

    // Real-time Group Notifications
    notifyUserOfGroupAccess(userId: number, group: any) {
        const roomName = `user_${userId}`;
        console.log(`[ChatGateway] Emitting group.access_granted to ${roomName} for group ${group.id}`);
        this.server.to(roomName).emit('group.access_granted', group);
    }

    notifyUserOfGroupRemoval(userId: number, groupId: number, channelId: number) {
        const roomName = `user_${userId}`;
        console.log(`[ChatGateway] Emitting group.access_revoked to ${roomName} for groupId ${groupId}, channelId ${channelId}`);
        this.server.to(roomName).emit('group.access_revoked', { groupId, channelId });
    }
}
