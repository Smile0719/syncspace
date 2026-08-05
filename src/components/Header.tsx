import React, { useState, useEffect } from "react";
import {
  Users,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  Columns2,
  SquareCode,
  Pencil,
  Clock,
  CircleDot,
  Radio,
} from "lucide-react";
import { UserPresence, UserRole } from "../types";

interface HeaderProps {
  roomId: string;
  users: UserPresence[];
  currentUser: UserPresence;
  onUpdateUserRole: (role: UserRole) => void;
  layoutMode: "split" | "whiteboard" | "code";
  onChangeLayout: (mode: "split" | "whiteboard" | "code") => void;
  onOpenAiModal: () => void;
  onExportSnapshot: () => void;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  users,
  currentUser,
  onUpdateUserRole,
  layoutMode,
  onChangeLayout,
  onOpenAiModal,
  onExportSnapshot,
  isConnected,
}) => {
  const [copied, setCopied] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 text-slate-100 px-4 flex items-center justify-between shadow-md select-none z-30">
      {/* Left: Brand & Room Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-inner">
            S
          </div>
          <span className="font-semibold text-lg tracking-tight bg-linear-to-r from-indigo-300 via-violet-200 to-white bg-clip-text text-transparent">
            SyncSpace
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Room badge */}
        <div className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-md px-2.5 py-1 text-xs font-mono transition-colors">
          <span className="text-slate-400">Room:</span>
          <span className="text-indigo-300 font-medium">{roomId}</span>
          <button
            onClick={handleCopyLink}
            title="Copy Share Link"
            className="text-slate-400 hover:text-white transition-colors ml-1 p-0.5 rounded hover:bg-slate-700"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/50 text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}
          />
          <span className="text-slate-400 font-medium">
            {isConnected ? "Live" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Middle: Layout Modes & Interview Timer */}
      <div className="flex items-center gap-4">
        {/* View Mode Switcher */}
        <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => onChangeLayout("whiteboard")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              layoutMode === "whiteboard"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Whiteboard</span>
          </button>
          <button
            onClick={() => onChangeLayout("split")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              layoutMode === "split"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split 50/50</span>
          </button>
          <button
            onClick={() => onChangeLayout("code")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              layoutMode === "code"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <SquareCode className="w-3.5 h-3.5" />
            <span>Code Editor</span>
          </button>
        </div>

        {/* Stopwatch / Interview Timer */}
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-200 min-w-10.5">
            {formatTimer(timerSeconds)}
          </span>
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="text-slate-300 hover:text-white p-0.5 rounded hover:bg-slate-700 transition-colors"
          >
            {isTimerRunning ? (
              <Pause className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>
          <button
            onClick={() => {
              setIsTimerRunning(false);
              setTimerSeconds(0);
            }}
            className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right: AI Tools, Export, User Presences */}
      <div className="flex items-center gap-3">
        {/* Gemini AI Assistant Button */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-medium shadow-md hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-200" />
          <span>AI Architect & Copilot</span>
        </button>

        {/* Export Snapshot */}
        <button
          onClick={onExportSnapshot}
          title="Export Workspace Snapshot"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* User Presence & Role Selector */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
          >
            <div className="flex -space-x-2 overflow-hidden">
              {users.slice(0, 4).map((u) => (
                <div
                  key={u.id}
                  className="h-6 w-6 rounded-full ring-2 ring-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow"
                  style={{ backgroundColor: u.color }}
                  title={`${u.name} (${u.role})`}
                >
                  {u.name.substring(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-300">
              {users.length} {users.length === 1 ? "user" : "users"}
            </span>
          </button>

          {/* User Profile & Role Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200">
                  Active Collaborators
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded max-w-25">
                  {users.length} connected
                </span>
              </div>

              {/* User List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-slate-200 font-medium truncate max-w-25">
                        {u.name}
                      </span>
                      {u.id === currentUser.id && (
                        <span className="text-[9px] text-indigo-400 bg-indigo-950 px-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <span className="capitalize text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-900 rounded">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>

              {/* Change My Role */}
              <div className="mt-3 pt-2 border-t border-slate-800">
                <label className="block text-[10px] text-slate-400 mb-1">
                  Your Role in Room:
                </label>
                <select
                  value={currentUser.role}
                  onChange={(e) => onUpdateUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="interviewer">Interviewer</option>
                  <option value="candidate">Candidate</option>
                  <option value="collaborator">Collaborator</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
