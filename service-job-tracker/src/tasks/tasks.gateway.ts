import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true
    },
})
export class TasksGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    afterInit(server: Server) {
        console.log('[TasksGateway] Initialized');
    }

    handleConnection(client: Socket) {
        // console.log(`[TasksGateway] Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        // console.log(`[TasksGateway] Client disconnected: ${client.id}`);
    }

    sendTaskCreated(task: any) {
        // Broadcast to all clients (in future, we might scope to departments)
        this.server.emit('task_created', task);
    }

    sendTaskUpdated(task: any) {
        this.server.emit('task_updated', task);
    }

    sendTaskDeleted(taskId: number) {
        this.server.emit('task_deleted', { id: taskId });
    }
}
