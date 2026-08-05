import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Whiteboard } from "./components/Whiteboard";
import { CodeEditor } from "./components/CodeEditor";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { ChatPanel } from "./components/ChatPanel";
import {
  CanvasElement,
  CodeFile,
  ChatMessage,
  UserPresence,
  UserRole,
} from "./types";
import { getSocket } from "./lib/socket";

const DEFAULT_CODE_FILE: CodeFile = {
  id: "main-ts",
  name: "solution.ts",
  language: "typescript",
  content: `// SyncSpace Collaborative Code Environment\n// Shared room: syncspace-room-1\n\nfunction calculateMetrics(items: number[]): { sum: number; avg: number } {\n  const sum = items.reduce((acc, curr) => acc + curr, 0);\n  const avg = items.length ? sum / items.length : 0;\n  return { sum, avg };\n}\n\nconst sampleData = [12, 45, 68, 23, 89];\nconsole.log('Calculated Results:', calculateMetrics(sampleData));\n`,
  version: 1,
};

export default function App() {
  // Derive Room ID from URL or default
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || "syncspace-room-1";
  });

  // User Identity
  const [currentUser, setCurrentUser] = useState<UserPresence>(() => ({
    id: `user-${Math.random().toString(36).substring(2, 7)}`,
    socketId: "",
    name: `Dev-${Math.floor(1000 + Math.random() * 9000)}`,
    color: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#8b5cf6"][
      Math.floor(Math.random() * 6)
    ],
    role: "collaborator",
    lastActive: Date.now(),
  }));

  // Room State
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [files, setFiles] = useState<CodeFile[]>([DEFAULT_CODE_FILE]);
  const [activeFileId, setActiveFileId] = useState<string>(
    DEFAULT_CODE_FILE.id,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // UI State
  const [layoutMode, setLayoutMode] = useState<"split" | "whiteboard" | "code">(
    "split",
  );
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [copilotAction, setCopilotAction] = useState<{
    action: string;
    code: string;
    language: string;
  } | null>(null);

  // --- SOCKET INTEGRATION ---
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("room:join", {
        roomId,
        user: currentUser,
      });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

    // Room Initialization State
    socket.on(
      "room:init",
      (data: {
        roomId: string;
        elements: CanvasElement[];
        files: CodeFile[];
        activeFileId: string;
        messages: ChatMessage[];
        users: UserPresence[];
      }) => {
        const nextFiles = data.files?.length ? data.files : [DEFAULT_CODE_FILE];
        setElements(data.elements || []);
        setFiles(nextFiles);
        setActiveFileId(
          data.activeFileId || nextFiles[0]?.id || DEFAULT_CODE_FILE.id,
        );
        setMessages(data.messages || []);
        setUsers(data.users || []);
      },
    );

    // User Presence updates
    socket.on("user:joined", (user: UserPresence) => {
      setUsers((prev) => {
        if (prev.some((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socket.on("user:left", (socketId: string) => {
      setUsers((prev) => prev.filter((u) => u.socketId !== socketId));
    });

    // Whiteboard Element events
    socket.on("canvas:element:upsert", (element: CanvasElement) => {
      setElements((prev) => {
        const index = prev.findIndex((e) => e.id === element.id);
        if (index !== -1) {
          const copy = [...prev];
          copy[index] = element;
          return copy;
        }
        return [...prev, element];
      });
    });

    socket.on("canvas:elements:bulk", (newElements: CanvasElement[]) => {
      setElements((prev) => {
        const map = new Map(prev.map((e) => [e.id, e]));
        newElements.forEach((e) => map.set(e.id, e));
        return Array.from(map.values());
      });
    });

    socket.on("canvas:element:delete", (elementId: string) => {
      setElements((prev) => prev.filter((e) => e.id !== elementId));
    });

    socket.on("canvas:clear", () => {
      setElements([]);
    });

    // Cursor position updates
    socket.on(
      "cursor:update",
      ({
        socketId,
        cursor,
      }: {
        socketId: string;
        cursor: { x: number; y: number };
      }) => {
        setUsers((prev) =>
          prev.map((u) => (u.socketId === socketId ? { ...u, cursor } : u)),
        );
      },
    );

    // Code Editor sync events
    socket.on(
      "code:change",
      ({
        fileId,
        content,
        version,
        updatedBy,
      }: {
        fileId: string;
        content: string;
        version: number;
        updatedBy: string;
      }) => {
        if (updatedBy !== socket.id) {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, content, version } : f)),
          );
        }
      },
    );

    socket.on("code:file:created", (file: CodeFile) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === file.id)) return prev;
        return [...prev, file];
      });
    });

    socket.on(
      "code:cursor:update",
      ({
        socketId,
        fileId,
        lineNumber,
        column,
      }: {
        socketId: string;
        fileId: string;
        lineNumber: number;
        column: number;
      }) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.socketId === socketId
              ? { ...u, codeCursor: { lineNumber, column } }
              : u,
          ),
        );
      },
    );

    // Chat messages
    socket.on("chat:message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:init");
      socket.off("user:joined");
      socket.off("user:left");
      socket.off("canvas:element:upsert");
      socket.off("canvas:elements:bulk");
      socket.off("canvas:element:delete");
      socket.off("canvas:clear");
      socket.off("cursor:update");
      socket.off("code:change");
      socket.off("code:file:created");
      socket.off("code:cursor:update");
      socket.off("chat:message");
    };
  }, [roomId, currentUser]);

  // --- LOCAL ACTIONS & EMITS ---
  const handleUpsertElement = (element: CanvasElement) => {
    // Optimistic update
    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === element.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = element;
        return copy;
      }
      return [...prev, element];
    });

    getSocket().emit("canvas:element:upsert", element);
  };

  const handleDeleteElement = (id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
    getSocket().emit("canvas:element:delete", id);
  };

  const handleClearCanvas = () => {
    setElements([]);
    getSocket().emit("canvas:clear");
  };

  const handleCursorMove = useCallback((cursor: { x: number; y: number }) => {
    getSocket().emit("cursor:move", cursor);
  }, []);

  const handleUpdateFileContent = (fileId: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          const nextVersion = f.version + 1;
          getSocket().emit("code:change", {
            fileId,
            content,
            version: nextVersion,
          });
          return { ...f, content, version: nextVersion };
        }
        return f;
      }),
    );
  };

  const handleCreateFile = (file: CodeFile) => {
    setFiles((prev) => [...prev, file]);
    setActiveFileId(file.id);
    getSocket().emit("code:file:create", file);
  };

  const handleCodeCursorMove = useCallback(
    (fileId: string, lineNumber: number, column: number) => {
      getSocket().emit("code:cursor:move", { fileId, lineNumber, column });
    },
    [],
  );

  const handleSendMessage = (text: string) => {
    getSocket().emit("chat:message", text);
  };

  const handleUpdateUserRole = (role: UserRole) => {
    setCurrentUser((prev) => ({ ...prev, role }));
  };

  const handleInjectDiagramElements = (newElements: CanvasElement[]) => {
    setElements((prev) => [...prev, ...newElements]);
    getSocket().emit("canvas:elements:bulk", newElements);
  };

  const handleAskAiCopilot = (
    action: string,
    code: string,
    language: string,
  ) => {
    setCopilotAction({ action, code, language });
    setIsAiModalOpen(true);
  };

  const handleExportSnapshot = () => {
    const snapshot = {
      roomId,
      exportedAt: new Date().toISOString(),
      elements,
      files,
      messages,
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `syncspace-snapshot-${roomId}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans">
      {/* Top Header Navigation */}
      <Header
        roomId={roomId}
        users={users}
        currentUser={currentUser}
        onUpdateUserRole={handleUpdateUserRole}
        layoutMode={layoutMode}
        onChangeLayout={setLayoutMode}
        onOpenAiModal={() => {
          setCopilotAction(null);
          setIsAiModalOpen(true);
        }}
        onExportSnapshot={handleExportSnapshot}
        isConnected={isConnected}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 relative flex overflow-hidden">
        {/* Whiteboard Panel */}
        {(layoutMode === "whiteboard" || layoutMode === "split") && (
          <div
            className={`h-full relative transition-all duration-300 ${
              layoutMode === "whiteboard"
                ? "w-full"
                : "w-1/2 border-r border-slate-800"
            }`}
          >
            <Whiteboard
              elements={elements}
              onUpsertElement={handleUpsertElement}
              onDeleteElement={handleDeleteElement}
              onClearCanvas={handleClearCanvas}
              onCursorMove={handleCursorMove}
              remoteUsers={users.filter((u) => u.id !== currentUser.id)}
              currentUser={currentUser}
              onOpenAiGenerator={() => {
                setCopilotAction(null);
                setIsAiModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Code Editor Panel */}
        {(layoutMode === "code" || layoutMode === "split") && (
          <div
            className={`h-full relative transition-all duration-300 ${
              layoutMode === "code" ? "w-full" : "w-1/2"
            }`}
          >
            <CodeEditor
              files={files}
              activeFileId={activeFileId}
              onSelectFile={setActiveFileId}
              onCreateFile={handleCreateFile}
              onUpdateFileContent={handleUpdateFileContent}
              onCursorMove={handleCodeCursorMove}
              remoteUsers={users.filter((u) => u.id !== currentUser.id)}
              currentUser={currentUser}
              onAskAiCopilot={handleAskAiCopilot}
            />
          </div>
        )}
      </main>

      {/* Floating Chat & System Activity Logs */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUser={currentUser}
      />

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        elements={elements}
        activeFile={activeFile}
        onInjectDiagramElements={handleInjectDiagramElements}
        initialCopilotAction={copilotAction}
      />
    </div>
  );
}
