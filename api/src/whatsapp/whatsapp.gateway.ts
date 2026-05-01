import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets"
import { Server } from "socket.io"
import type { WhatsappConnectionView } from "./whatsapp.service"

@WebSocketGateway({
  namespace: "/whatsapp",
  cors: {
    origin: "*"
  }
})
export class WhatsappGateway {
  @WebSocketServer()
  server!: Server

  emitSessionUpdated(payload: WhatsappConnectionView) {
    this.server.emit("whatsapp_session_updated", payload)
  }
}
