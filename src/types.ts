export type UserRole = 'interviewer' | 'candidate' | 'collaborator';

export interface UserPresence {
  id: string;
  socketId: string;
  name: string;
  color: string;
  role: UserRole;
  cursor?: { x: number; y: number };
  codeCursor?: { lineNumber: number; column: number };
  activePanel?: 'whiteboard' | 'code' | 'both';
  lastActive: number;
}

export type ToolType =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'text'
  | 'sticky';

export interface CanvasElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[]; // for pen freehand lines [x1, y1, x2, y2, ...]
  stroke: string;
  fill: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  updatedAt: number;
  updatedBy: string;
}

export interface CodeFile {
  id: string;
  name: string;
  language: string;
  content: string;
  version: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system';
}

export interface RoomState {
  roomId: string;
  elements: CanvasElement[];
  files: CodeFile[];
  activeFileId: string;
  messages: ChatMessage[];
  users: UserPresence[];
}

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTimeMs: number;
}
