import React, { useState, useRef } from 'react';
import Editor, { OnChange, OnMount } from '@monaco-editor/react';
import {
  Play,
  Terminal,
  FileCode,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { CodeFile, ExecutionResult, UserPresence } from '../types';
import { runCodeInSandbox } from '../lib/codeRunner';

interface CodeEditorProps {
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onCreateFile: (file: CodeFile) => void;
  onUpdateFileContent: (fileId: string, content: string) => void;
  onCursorMove: (fileId: string, lineNumber: number, column: number) => void;
  remoteUsers: UserPresence[];
  currentUser: UserPresence;
  onAskAiCopilot: (action: string, code: string, language: string) => void;
}

const LANGUAGES = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'rust', label: 'Rust' },
];

export const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onUpdateFileContent,
  onCursorMove,
  remoteUsers,
  currentUser,
  onAskAiCopilot,
}) => {
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showTerminal, setShowTerminal] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);

  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Track cursor movement
    editor.onDidChangeCursorPosition((e: any) => {
      onCursorMove(
        activeFile?.id || 'main',
        e.position.lineNumber,
        e.position.column
      );
    });

    // Configure dark theme
    monaco.editor.defineTheme('syncspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c586c0', fontStyle: 'bold' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
      ],
      colors: {
        'editor.background': '#090d16',
        'editor.lineHighlightBackground': '#1e293b50',
        'editorCursor.foreground': '#818cf8',
        'editor.selectionBackground': '#3730a380',
      },
    });
    monaco.editor.setTheme('syncspace-dark');
  };

  const handleCodeChange: OnChange = (value) => {
    if (value !== undefined && activeFile) {
      onUpdateFileContent(activeFile.id, value);
    }
  };

  const handleRunCode = async () => {
    if (!activeFile) return;
    setExecuting(true);
    setShowTerminal(true);

    try {
      const res = await runCodeInSandbox(activeFile.content, activeFile.language);
      setExecutionResult(res);
    } catch (err: any) {
      setExecutionResult({
        output: '',
        error: err.message || 'Execution failed',
        executionTimeMs: 0,
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) return;
    const ext = newFileName.split('.').pop() || 'ts';
    let lang = 'typescript';
    if (ext === 'py') lang = 'python';
    if (ext === 'js') lang = 'javascript';
    if (ext === 'html') lang = 'html';
    if (ext === 'css') lang = 'css';

    const newFile: CodeFile = {
      id: `file-${Date.now()}`,
      name: newFileName.trim(),
      language: lang,
      content: `// New collaborative file: ${newFileName}\n`,
      version: 1,
    };

    onCreateFile(newFile);
    setNewFileName('');
    setIsCreatingFile(false);
  };

  return (
    <div className="w-full h-full bg-[#090d16] flex flex-col overflow-hidden text-slate-100 select-none">
      {/* Top File Tabs & Controls Bar */}
      <div className="h-10 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3">
        {/* File Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded-t-lg text-xs font-mono transition-all ${
                file.id === activeFile?.id
                  ? 'bg-[#090d16] text-indigo-300 border-t-2 border-indigo-500 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>{file.name}</span>
            </button>
          ))}

          {/* New File Trigger */}
          {isCreatingFile ? (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs">
              <input
                type="text"
                placeholder="filename.ts"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()}
                autoFocus
                className="bg-transparent text-slate-100 focus:outline-none w-24 font-mono text-[11px]"
              />
              <button
                onClick={handleCreateNewFile}
                className="text-indigo-400 hover:text-indigo-300 font-bold"
              >
                +
              </button>
              <button
                onClick={() => setIsCreatingFile(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingFile(true)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              title="Add New Code File"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Controls: AI Copilot Shortcuts & Run Code */}
        <div className="flex items-center gap-2">
          {/* AI Copilot Menu */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => onAskAiCopilot('explain', activeFile?.content || '', activeFile?.language || 'typescript')}
              className="px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="Explain Code Logic"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Explain</span>
            </button>
            <button
              onClick={() => onAskAiCopilot('review', activeFile?.content || '', activeFile?.language || 'typescript')}
              className="px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Review Security & Performance"
            >
              Review
            </button>
            <button
              onClick={() => onAskAiCopilot('optimize', activeFile?.content || '', activeFile?.language || 'typescript')}
              className="px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Optimize Code"
            >
              Optimize
            </button>
          </div>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={executing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{executing ? 'Executing...' : 'Run Code'}</span>
          </button>
        </div>
      </div>

      {/* Main Code Editor Area */}
      <div className="flex-1 relative">
        {activeFile ? (
          <Editor
            height="100%"
            language={activeFile.language}
            value={activeFile.content}
            theme="syncspace-dark"
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              fontFamily: 'Fira Code, JetBrains Mono, Menlo, monospace',
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbersMinChars: 3,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 12, bottom: 12 },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Select or create a code file to start editing.
          </div>
        )}

        {/* Remote Cursors Indicator Tag */}
        <div className="absolute top-2 right-4 z-10 flex flex-col gap-1 pointer-events-none">
          {remoteUsers.map((user) => {
            if (!user.codeCursor) return null;
            return (
              <div
                key={user.id}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] text-white shadow-md bg-slate-900/90 border border-slate-700 backdrop-blur"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }} />
                <span>{user.name}</span>
                <span className="text-slate-400 font-mono">
                  L:{user.codeCursor.lineNumber} C:{user.codeCursor.column}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Execution Output Terminal Panel */}
      {showTerminal && (
        <div className="h-44 bg-slate-950 border-t border-slate-800 flex flex-col text-xs font-mono">
          {/* Terminal Header */}
          <div className="h-8 bg-slate-900 px-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-300">Execution Terminal</span>
              {executionResult && (
                <div className="flex items-center gap-2 text-[11px] ml-2">
                  {executionResult.error ? (
                    <span className="flex items-center gap-1 text-rose-400">
                      <XCircle className="w-3 h-3" /> Error
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="w-3 h-3" /> Success
                    </span>
                  )}
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {executionResult.executionTimeMs}ms
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setExecutionResult(null)}
                className="text-slate-400 hover:text-slate-200 text-[11px]"
              >
                Clear
              </button>
              <button
                onClick={() => setShowTerminal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Output Content */}
          <div className="flex-1 p-3 overflow-y-auto bg-[#050811] text-slate-300 space-y-1">
            {executing ? (
              <div className="text-indigo-400 animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                Running code in sandbox environment...
              </div>
            ) : executionResult ? (
              <div>
                {executionResult.output && (
                  <pre className="whitespace-pre-wrap font-mono text-emerald-300">
                    {executionResult.output}
                  </pre>
                )}
                {executionResult.error && (
                  <pre className="whitespace-pre-wrap font-mono text-rose-400 font-semibold mt-1">
                    {executionResult.error}
                  </pre>
                )}
              </div>
            ) : (
              <div className="text-slate-600 italic">
                Press "Run Code" above to execute current file in sandbox.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
