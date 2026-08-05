import express from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  CanvasElement,
  CodeFile,
  ChatMessage,
  UserPresence,
} from "./src/types.js";

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1e7,
  });

  // Initialize Gemini AI Client lazily/safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({ apiKey });
  };

  // In-Memory Room Data Store
  const rooms: Record<
    string,
    {
      elements: Map<string, CanvasElement>;
      files: CodeFile[];
      activeFileId: string;
      messages: ChatMessage[];
      users: Map<string, UserPresence>;
    }
  > = {};

  const getOrCreateRoom = (roomId: string) => {
    if (!rooms[roomId]) {
      const defaultFile: CodeFile = {
        id: "main-ts",
        name: "solution.ts",
        language: "typescript",
        content: `// SyncSpace Collaborative Code Environment\n// Shared room: ${roomId}\n\nfunction calculateMetrics(items: number[]): { sum: number; avg: number } {\n  const sum = items.reduce((acc, curr) => acc + curr, 0);\n  const avg = items.length ? sum / items.length : 0;\n  return { sum, avg };\n}\n\nconst sampleData = [12, 45, 68, 23, 89];\nconsole.log("Calculated Results:", calculateMetrics(sampleData));\n`,
        version: 1,
      };

      rooms[roomId] = {
        elements: new Map<string, CanvasElement>(),
        files: [defaultFile],
        activeFileId: defaultFile.id,
        messages: [
          {
            id: `msg-${Date.now()}`,
            senderId: "system",
            senderName: "System",
            senderColor: "#6366f1",
            text: `Welcome to SyncSpace Room "${roomId}". Whiteboard & Code Editor are connected live.`,
            timestamp: Date.now(),
            type: "system",
          },
        ],
        users: new Map<string, UserPresence>(),
      };
    }
    return rooms[roomId];
  };

  // --- API ROUTES ---
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", activeRooms: Object.keys(rooms).length });
  });

  // AI Route: Analyze Architecture Diagram
  app.post("/api/ai/analyze-diagram", async (req, res) => {
    try {
      const { imageBase64, elements, prompt } = req.body;
      const ai = getGeminiClient();

      let systemInstruction =
        "You are a Principal Software Architect analyzing a system diagram. Provide structured feedback including architecture summary, key components, security considerations, scalability bottlenecks, and suggested improvements.";
      let contentParts: any[] = [];

      if (imageBase64) {
        // Clean up base64 prefix
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        contentParts.push({
          inlineData: {
            mimeType: "image/png",
            data: base64Data,
          },
        });
      }

      contentParts.push({
        text: `${prompt || "Analyze this architecture diagram."}\nContextual elements: ${JSON.stringify(elements || [])}`,
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contentParts,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error("AI Diagram error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to analyze diagram" });
    }
  });

  // AI Route: Code Copilot & Reviewer
  app.post("/api/ai/code-copilot", async (req, res) => {
    try {
      const { code, language, action, userPrompt } = req.body;
      const ai = getGeminiClient();

      let promptText = "";
      if (action === "explain") {
        promptText = `Explain the following ${language} code clearly with step-by-step logic analysis:\n\`\`\`${language}\n${code}\n\`\`\``;
      } else if (action === "review") {
        promptText = `Perform a comprehensive Code Review for the following ${language} code. Focus on bugs, security vulnerabilities, performance bottlenecks, and best practices:\n\`\`\`${language}\n${code}\n\`\`\``;
      } else if (action === "optimize") {
        promptText = `Optimize the following ${language} code for better performance and readability. Return the optimized code first in a code block, followed by explanations:\n\`\`\`${language}\n${code}\n\`\`\``;
      } else if (action === "test") {
        promptText = `Generate comprehensive unit test cases for the following ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;
      } else {
        promptText = `${userPrompt || "Assist with code"}:\n\`\`\`${language}\n${code}\n\`\`\``;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptText,
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error("AI Code error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to process code AI request" });
    }
  });

  // AI Route: Text to Diagram Generator
  app.post("/api/ai/text-to-diagram", async (req, res) => {
    try {
      const { description } = req.body;
      const ai = getGeminiClient();

      const systemPrompt = `You are an expert system designer. Convert the requested architecture description into a JSON array of whiteboard canvas elements.
Supported tool types: "rectangle", "circle", "arrow", "text", "sticky".
Format required:
JSON array ONLY without markdown formatting:
[
  {
    "id": "elem-1",
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 160,
    "height": 80,
    "stroke": "#6366f1",
    "fill": "#e0e7ff",
    "strokeWidth": 2,
    "text": "API Gateway"
  }
]
Constraints:
- Space elements nicely on a canvas grid (X: 100 to 900, Y: 100 to 600).
- Use clear colors like #6366f1 (Indigo), #10b981 (Emerald), #f59e0b (Amber), #ef4444 (Rose), #3b82f6 (Blue).
- Include text labels on rectangles and connecting arrows.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create canvas elements JSON for this architecture: ${description}`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2,
        },
      });

      let rawText = response.text || "";
      rawText = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const generatedElements = JSON.parse(rawText);

      res.json({ elements: generatedElements });
    } catch (err: any) {
      console.error("Text to Diagram error:", err);
      res
        .status(500)
        .json({
          error: err.message || "Failed to generate diagram from description",
        });
    }
  });

  // --- SOCKET.IO EVENT HANDLING ---
  io.on("connection", (socket) => {
    let currentRoomId = "";
    let userId = socket.id;

    socket.on(
      "room:join",
      ({ roomId, user }: { roomId: string; user: Partial<UserPresence> }) => {
        currentRoomId = roomId || "default-room";
        socket.join(currentRoomId);

        const room = getOrCreateRoom(currentRoomId);

        const userPresence: UserPresence = {
          id: user.id || socket.id,
          socketId: socket.id,
          name: user.name || `Dev-${socket.id.substring(0, 4)}`,
          color:
            user.color ||
            `#${Math.floor(Math.random() * 16777215)
              .toString(16)
              .padStart(6, "0")}`,
          role: user.role || "collaborator",
          cursor: { x: 0, y: 0 },
          codeCursor: { lineNumber: 1, column: 1 },
          lastActive: Date.now(),
        };

        room.users.set(socket.id, userPresence);

        // Send full room state to newly joined user
        socket.emit("room:init", {
          roomId: currentRoomId,
          elements: Array.from(room.elements.values()),
          files: room.files,
          activeFileId: room.activeFileId,
          messages: room.messages,
          users: Array.from(room.users.values()),
        });

        // Broadcast new user joined to room
        socket.to(currentRoomId).emit("user:joined", userPresence);

        // System notification message
        const sysMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderName: "System",
          senderColor: "#6366f1",
          text: `${userPresence.name} joined the session as ${userPresence.role}.`,
          timestamp: Date.now(),
          type: "system",
        };
        room.messages.push(sysMsg);
        io.to(currentRoomId).emit("chat:message", sysMsg);
      },
    );

    // Real-Time Whiteboard Element Upsert (CRDT / Last-Write-Wins)
    socket.on("canvas:element:upsert", (element: CanvasElement) => {
      if (!currentRoomId) return;
      const room = rooms[currentRoomId];
      if (!room) return;

      const existing = room.elements.get(element.id);
      // Conflict Resolution: Accept if new element or updated at a later/equal timestamp
      if (!existing || element.updatedAt >= existing.updatedAt) {
        room.elements.set(element.id, element);
        socket.to(currentRoomId).emit("canvas:element:upsert", element);
      }
    });

    // Bulk canvas elements upsert (e.g. AI diagram generation or undo/redo)
    socket.on("canvas:elements:bulk", (elements: CanvasElement[]) => {
      if (!currentRoomId) return;
      const room = rooms[currentRoomId];
      if (!room) return;

      elements.forEach((elem) => {
        room.elements.set(elem.id, elem);
      });
      io.to(currentRoomId).emit("canvas:elements:bulk", elements);
    });

    // Element Delete
    socket.on("canvas:element:delete", (elementId: string) => {
      if (!currentRoomId) return;
      const room = rooms[currentRoomId];
      if (!room) return;

      if (room.elements.has(elementId)) {
        room.elements.delete(elementId);
        socket.to(currentRoomId).emit("canvas:element:delete", elementId);
      }
    });

    // Canvas Clear
    socket.on("canvas:clear", () => {
      if (!currentRoomId) return;
      const room = rooms[currentRoomId];
      if (!room) return;

      room.elements.clear();
      io.to(currentRoomId).emit("canvas:clear");
    });

    // Cursor Movement
    socket.on("cursor:move", (cursor: { x: number; y: number }) => {
      if (!currentRoomId) return;
      const room = rooms[currentRoomId];
      if (!room) return;

      const user = room.users.get(socket.id);
      if (user) {
        user.cursor = cursor;
        user.lastActive = Date.now();
        socket.to(currentRoomId).emit("cursor:update", {
          socketId: socket.id,
          cursor,
        });
      }
    });

    // Code Editor Change Synchronization
    socket.on(
      "code:change",
      ({
        fileId,
        content,
        version,
      }: {
        fileId: string;
        content: string;
        version: number;
      }) => {
        if (!currentRoomId) return;
        const room = rooms[currentRoomId];
        if (!room) return;

        const fileIndex = room.files.findIndex((f) => f.id === fileId);
        if (fileIndex !== -1) {
          room.files[fileIndex].content = content;
          room.files[fileIndex].version = version;

          socket.to(currentRoomId).emit("code:change", {
            fileId,
            content,
            version,
            updatedBy: socket.id,
          });
        }
      },
    );

    // Code File Operations (Create / Rename / Delete)
    socket.on("code:file:create", (file: CodeFile) => {
      if (!currentRoomId) return;
      const room = rooms[currentRoomId];
      if (!room) return;

      if (!room.files.some((f) => f.id === file.id)) {
        room.files.push(file);
        io.to(currentRoomId).emit("code:file:created", file);
      }
    });

    socket.on(
      "code:cursor:move",
      ({
        fileId,
        lineNumber,
        column,
      }: {
        fileId: string;
        lineNumber: number;
        column: number;
      }) => {
        if (!currentRoomId) return;
        const room = rooms[currentRoomId];
        if (!room) return;

        const user = room.users.get(socket.id);
        if (user) {
          user.codeCursor = { lineNumber, column };
          socket.to(currentRoomId).emit("code:cursor:update", {
            socketId: socket.id,
            fileId,
            lineNumber,
            column,
            userColor: user.color,
            userName: user.name,
          });
        }
      },
    );

    // Chat Message
    socket.on("chat:message", (text: string) => {
      if (!currentRoomId) return;
      const room = rooms[currentRoomId];
      if (!room) return;

      const user = room.users.get(socket.id);
      if (!user) return;

      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        senderId: user.id,
        senderName: user.name,
        senderColor: user.color,
        text,
        timestamp: Date.now(),
        type: "chat",
      };

      room.messages.push(msg);
      io.to(currentRoomId).emit("chat:message", msg);
    });

    // Disconnect Handler
    socket.on("disconnect", () => {
      if (currentRoomId && rooms[currentRoomId]) {
        const room = rooms[currentRoomId];
        const user = room.users.get(socket.id);

        if (user) {
          room.users.delete(socket.id);
          socket.to(currentRoomId).emit("user:left", socket.id);

          const sysMsg: ChatMessage = {
            id: `sys-${Date.now()}`,
            senderId: "system",
            senderName: "System",
            senderColor: "#ef4444",
            text: `${user.name} left the room.`,
            timestamp: Date.now(),
            type: "system",
          };
          room.messages.push(sysMsg);
          io.to(currentRoomId).emit("chat:message", sysMsg);
        }
      }
    });
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`SyncSpace server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
