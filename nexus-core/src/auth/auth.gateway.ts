import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class AuthGateway {
    @WebSocketServer()
    server: Server;

    constructor(private jwtService: JwtService) { }

    // 1. Web Client generates a random UUID and connects
    @SubscribeMessage('join_auth_session')
    handleJoinSession(
        @MessageBody() sessionId: string,
        @ConnectedSocket() client: Socket,
    ) {
        client.join(`auth_${sessionId}`);
        console.log(`Web Client joined auth session: ${sessionId}`);
        return { status: 'waiting_for_scan' };
    }

    // 2. Mobile App scans QR (sessionId) and sends its Token
    @SubscribeMessage('authorize_session')
    async handleAuthorizeSession(
        @MessageBody() data: { sessionId: string; token: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            // Verify Mobile User's Token
            const payload = this.jwtService.verify(data.token);

            console.log(`Mobile User ${payload.sub} authorized session ${data.sessionId}`);

            // 3. Notify Web Client
            this.server.to(`auth_${data.sessionId}`).emit('session_authenticated', {
                token: data.token, // Send the token to the web client (simplified flow)
                user: payload,
            });

            return { status: 'success' };
        } catch (e) {
            console.error('Auth verification failed', e);
            return { status: 'failed', error: 'Invalid token' };
        }
    }
}
