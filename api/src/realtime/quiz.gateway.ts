import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({
  namespace: "/quiz",
  cors: {
    origin: "*"
  }
})
export class QuizGateway {
  @WebSocketServer()
  server!: Server;

  emitQuizStarted(payload: Record<string, unknown>) {
    this.server.emit("quiz_started", payload);
  }

  emitQuizFinished(payload: Record<string, unknown>) {
    this.server.emit("quiz_finished", payload);
  }

  emitParticipantFinished(payload: Record<string, unknown>) {
    this.server.emit("participant_finished", payload);
  }

  emitRankingUpdated(payload: Record<string, unknown>) {
    this.server.emit("ranking_updated", payload);
  }
}
