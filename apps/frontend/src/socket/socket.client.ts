import { io, Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "@dart/shared"

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(window.location.origin, {
    autoConnect: false,
})
