import React, { useState } from "react";
import {
  Sparkles,
  X,
  Cpu,
  Pencil,
  Code2,
  Send,
  Loader2,
  Copy,
  Check,
  Zap,
  Layout,
} from "lucide-react";
import { CanvasElement, CodeFile } from "../types";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: CanvasElement[];
  activeFile?: CodeFile;
  onInjectDiagramElements: (elements: CanvasElement[]) => void;
  initialCopilotAction?: {
    action: string;
    code: string;
    language: string;
  } | null;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  elements,
  activeFile,
  onInjectDiagramElements,
  initialCopilotAction,
}) => {
  const [activeTab, setActiveTab] = useState<
    "diagram" | "text2diagram" | "copilot"
  >(initialCopilotAction ? "copilot" : "diagram");

  // States
  const [diagramPrompt, setDiagramPrompt] = useState(
    "Analyze this architecture diagram for scalability bottlenecks, single points of failure, and security risks.",
  );
  const [diagramAnalysisResult, setDiagramAnalysisResult] = useState("");
  const [analyzingDiagram, setAnalyzingDiagram] = useState(false);

  const [text2DiagramInput, setText2DiagramInput] = useState(
    "Microservices architecture with API Gateway, Auth Service, Redis Cache, PostgreSQL Database, and RabbitMQ Message Broker.",
  );
  const [generatingDiagram, setGeneratingDiagram] = useState(false);

  const [copilotAction, setCopilotAction] = useState(
    initialCopilotAction?.action || "explain",
  );
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [copilotResult, setCopilotResult] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 1. Analyze Diagram
  const handleAnalyzeDiagram = async () => {
    setAnalyzingDiagram(true);
    setDiagramAnalysisResult("");

    try {
      const res = await fetch("/api/ai/analyze-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elements,
          prompt: diagramPrompt,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDiagramAnalysisResult(data.result);
    } catch (err: any) {
      setDiagramAnalysisResult(`Error analyzing diagram: ${err.message}`);
    } finally {
      setAnalyzingDiagram(false);
    }
  };

  // 2. Generate Diagram from Text
  const handleGenerateText2Diagram = async () => {
    setGeneratingDiagram(true);

    try {
      const res = await fetch("/api/ai/text-to-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text2DiagramInput }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.elements && Array.isArray(data.elements)) {
        onInjectDiagramElements(data.elements);
        onClose();
      }
    } catch (err: any) {
      alert(`Failed to generate diagram: ${err.message}`);
    } finally {
      setGeneratingDiagram(false);
    }
  };

  // 3. Code Copilot
  const handleRunCopilot = async () => {
    if (!activeFile) return;
    setCopilotLoading(true);
    setCopilotResult("");

    try {
      const res = await fetch("/api/ai/code-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language,
          action: copilotAction,
          userPrompt: copilotPrompt,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCopilotResult(data.result);
    } catch (err: any) {
      setCopilotResult(`Copilot Error: ${err.message}`);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleCopyResult = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-linear-to-tr from-violet-600 to-indigo-600 text-white shadow">
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                SyncSpace AI Architect
              </h3>
              <p className="text-xs text-slate-400">
                Powered by Gemini 2.5 Server-Side Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900 px-6 gap-2">
          <button
            onClick={() => setActiveTab("diagram")}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "diagram"
                ? "border-indigo-500 text-indigo-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Diagram Architecture Analyzer</span>
          </button>
          <button
            onClick={() => setActiveTab("text2diagram")}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "text2diagram"
                ? "border-indigo-500 text-indigo-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>Text-to-Diagram Generator</span>
          </button>
          <button
            onClick={() => setActiveTab("copilot")}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "copilot"
                ? "border-indigo-500 text-indigo-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Code Copilot & Review</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-200 space-y-4">
          {/* TAB 1: Diagram Architecture Analyzer */}
          {activeTab === "diagram" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-300">
                    Analysis Goal / Focus:
                  </span>
                  <span className="text-[11px] text-indigo-400 font-mono">
                    {elements.length} Whiteboard elements loaded
                  </span>
                </div>
                <textarea
                  value={diagramPrompt}
                  onChange={(e) => setDiagramPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAnalyzeDiagram}
                  disabled={analyzingDiagram || elements.length === 0}
                  className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
                >
                  {analyzingDiagram ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing Architecture...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Analyze Diagram with Gemini</span>
                    </>
                  )}
                </button>
              </div>

              {diagramAnalysisResult && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-indigo-300">
                      Architectural Analysis Report
                    </span>
                    <button
                      onClick={() => handleCopyResult(diagramAnalysisResult)}
                      className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="prose prose-invert prose-xs max-w-none text-slate-300 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {diagramAnalysisResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Text-to-Diagram Generator */}
          {activeTab === "text2diagram" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Describe System Architecture to Auto-Generate on Whiteboard:
                </label>
                <textarea
                  value={text2DiagramInput}
                  onChange={(e) => setText2DiagramInput(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Distributed system with Cloud Load Balancer, 3 Node.js App instances, Redis Cache, Postgres DB cluster, and Kafka Queue..."
                />
                <button
                  onClick={handleGenerateText2Diagram}
                  disabled={generatingDiagram || !text2DiagramInput.trim()}
                  className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
                >
                  {generatingDiagram ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Whiteboard Shapes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>Generate & Inject Diagram Elements</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Code Copilot & Review */}
          {activeTab === "copilot" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-300">
                    Copilot Action:
                  </span>
                  <select
                    value={copilotAction}
                    onChange={(e) => setCopilotAction(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-indigo-300 focus:outline-none"
                  >
                    <option value="explain">Explain Logic</option>
                    <option value="review">Code Review & Security</option>
                    <option value="optimize">Optimize Performance</option>
                    <option value="test">Generate Unit Tests</option>
                  </select>
                </div>

                {activeFile && (
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 max-h-24 overflow-y-auto">
                    Active File:{" "}
                    <span className="text-indigo-300">{activeFile.name}</span> (
                    {activeFile.language})
                  </div>
                )}

                <button
                  onClick={handleRunCopilot}
                  disabled={copilotLoading || !activeFile}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
                >
                  {copilotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Code Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Execute Copilot Action</span>
                    </>
                  )}
                </button>
              </div>

              {copilotResult && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-indigo-300">
                      Gemini Response
                    </span>
                    <button
                      onClick={() => handleCopyResult(copilotResult)}
                      className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="prose prose-invert prose-xs max-w-none text-slate-300 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {copilotResult}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
