import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'users',
})
@Injectable()
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Track online users: Map<UserId, SocketId[]>
    private onlineUsers = new Map<number, Set<string>>();

    handleConnection(client: Socket) {
        // Ideally verify token here, for now MVP assumes client sends userId in query or handshake
        const userId = client.handshake.query?.userId;
        if (userId) {
            const uid = parseInt(userId as string);
            if (!this.onlineUsers.has(uid)) {
                this.onlineUsers.set(uid, new Set());
            }
            this.onlineUsers.get(uid)?.add(client.id);
            this.broadcastOnlineStatus();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.handshake.query?.userId;
        if (userId) {
            const uid = parseInt(userId as string);
            if (this.onlineUsers.has(uid)) {
                const sessions = this.onlineUsers.get(uid);
                if (sessions) {
                    sessions.delete(client.id);
                    if (sessions.size === 0) {
                        this.onlineUsers.delete(uid);
                    }
                }
                this.broadcastOnlineStatus();
            }
        }
    }

    broadcastOnlineStatus() {
        const onlineUserIds = Array.from(this.onlineUsers.keys());
        this.server.emit('users:online', onlineUserIds);
    }

    // Called by Service
    notifyUserUpdated() {
        this.server.emit('users:update', { timestamp: Date.now() });
    }
}
