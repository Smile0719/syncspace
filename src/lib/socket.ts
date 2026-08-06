import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {

  if (socket) {
    return socket;
  }

  socket = io(window.location.origin, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"],
  });

  return socket;
};


export const disconnectSocket = () => {

  if (socket) {
    socket.disconnect();
    socket = null;
  }

};
