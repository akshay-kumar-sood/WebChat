import { io } from "socket.io-client";

export function connectWS() {
    const socketUrl =
        import.meta.env.VITE_SOCKET_URL || window.location.origin;

    return io(socketUrl, {
        transports: ["websocket"],
    });
}
