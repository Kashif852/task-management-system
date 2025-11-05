import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Task } from '../tasks/entities/task.entity';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  emitTaskUpdated(task: Task) {
    if (this.server) {
      this.server.emit('taskUpdated', task);
    }
  }

  emitTaskDeleted(taskId: string) {
    if (this.server) {
      this.server.emit('taskDeleted', { taskId });
    }
  }

  emitTaskAssigned(task: Task) {
    if (this.server) {
      this.server.emit('taskAssigned', task);
    }
  }
}

