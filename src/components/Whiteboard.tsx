import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer,
  Pencil,
  Eraser,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  Minus,
  Type,
  StickyNote,
  Trash2,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Grid,
  Maximize2,
  Sparkles,
  Palette
} from 'lucide-react';
import { CanvasElement, ToolType, UserPresence } from '../types';

interface WhiteboardProps {
  elements: CanvasElement[];
  onUpsertElement: (element: CanvasElement) => void;
  onDeleteElement: (id: string) => void;
  onClearCanvas: () => void;
  onCursorMove: (cursor: { x: number; y: number }) => void;
  remoteUsers: UserPresence[];
  currentUser: UserPresence;
  onOpenAiGenerator?: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff'];
const STROKE_WIDTHS = [2, 4, 8];

export const Whiteboard: React.FC<WhiteboardProps> = ({
  elements,
  onUpsertElement,
  onDeleteElement,
  onClearCanvas,
  onCursorMove,
  remoteUsers,
  currentUser,
  onOpenAiGenerator,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tool & Canvas State
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [selectedFill, setSelectedFill] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [gridPattern, setGridPattern] = useState<'dots' | 'grid' | 'blank'>('dots');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputValue, setTextInputValue] = useState('');

  // Undo/Redo history
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Mouse move throttling for cursor updates
  const lastCursorEmit = useRef<number>(0);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoomLevel,
      y: (e.clientY - rect.top) / zoomLevel,
    };
  };

  // --- RENDER CANVAS STATE ---
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);

    // Draw background grid pattern
    if (gridPattern === 'dots') {
      ctx.fillStyle = '#334155'; // dark slate dots
      for (let x = 20; x < canvas.width / zoomLevel; x += 24) {
        for (let y = 20; y < canvas.height / zoomLevel; y += 24) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }
    } else if (gridPattern === 'grid') {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < canvas.width / zoomLevel; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height / zoomLevel);
      }
      for (let y = 0; y < canvas.height / zoomLevel; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width / zoomLevel, y);
      }
      ctx.stroke();
    }

    // Render all elements
    elements.forEach((elem) => {
      ctx.save();
      ctx.strokeStyle = elem.stroke;
      ctx.fillStyle = elem.fill;
      ctx.lineWidth = elem.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const isSelected = elem.id === selectedElementId;

      switch (elem.type) {
        case 'pen':
          if (elem.points && elem.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(elem.points[0], elem.points[1]);
            for (let i = 2; i < elem.points.length; i += 2) {
              ctx.lineTo(elem.points[i], elem.points[i + 1]);
            }
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (elem.width && elem.height) {
            ctx.beginPath();
            ctx.rect(elem.x, elem.y, elem.width, elem.height);
            if (elem.fill !== 'transparent') ctx.fill();
            ctx.stroke();
          }
          break;

        case 'circle':
          if (elem.width && elem.height) {
            const radiusX = Math.abs(elem.width / 2);
            const radiusY = Math.abs(elem.height / 2);
            const centerX = elem.x + elem.width / 2;
            const centerY = elem.y + elem.height / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            if (elem.fill !== 'transparent') ctx.fill();
            ctx.stroke();
          }
          break;

        case 'line':
          if (elem.width !== undefined && elem.height !== undefined) {
            ctx.beginPath();
            ctx.moveTo(elem.x, elem.y);
            ctx.lineTo(elem.x + elem.width, elem.y + elem.height);
            ctx.stroke();
          }
          break;

        case 'arrow':
          if (elem.width !== undefined && elem.height !== undefined) {
            const fromX = elem.x;
            const fromY = elem.y;
            const toX = elem.x + elem.width;
            const toY = elem.y + elem.height;
            const headlen = 12;
            const angle = Math.atan2(toY - fromY, toX - fromX);

            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(toX, toY);
            ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
            ctx.lineTo(toX, toY);
            ctx.fillStyle = elem.stroke;
            ctx.fill();
          }
          break;

        case 'sticky':
          ctx.fillStyle = elem.fill || '#fef08a'; // yellow sticky
          ctx.strokeStyle = elem.stroke || '#f59e0b';
          ctx.lineWidth = 1;
          const w = elem.width || 140;
          const h = elem.height || 140;

          ctx.beginPath();
          ctx.rect(elem.x, elem.y, w, h);
          ctx.fill();
          ctx.stroke();

          // Sticky text
          ctx.fillStyle = '#1e293b';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(elem.text || 'Sticky Note', elem.x + w / 2, elem.y + h / 2, w - 16);
          break;

        case 'text':
          ctx.fillStyle = elem.stroke;
          ctx.font = `${elem.fontSize || 18}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(elem.text || 'Text', elem.x, elem.y);
          break;
      }

      // Draw bounding box selection indicator
      if (isSelected) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);

        let bx = elem.x;
        let by = elem.y;
        let bw = elem.width || 40;
        let bh = elem.height || 40;

        if (elem.type === 'pen' && elem.points && elem.points.length >= 4) {
          const xs = elem.points.filter((_, i) => i % 2 === 0);
          const ys = elem.points.filter((_, i) => i % 2 === 1);
          bx = Math.min(...xs) - 5;
          by = Math.min(...ys) - 5;
          bw = Math.max(...xs) - bx + 10;
          bh = Math.max(...ys) - by + 10;
        }

        ctx.strokeRect(bx - 4, by - 4, bw + 8, bh + 8);
        ctx.setLineDash([]);
      }

      ctx.restore();
    });

    // Draw active drawing pen path preview
    if (isDrawing && activeTool === 'pen' && currentPoints.length >= 2) {
      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentPoints[0], currentPoints[1]);
      for (let i = 2; i < currentPoints.length; i += 2) {
        ctx.lineTo(currentPoints[i], currentPoints[i + 1]);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw active shape preview
    if (isDrawing && startPos && (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'arrow' || activeTool === 'line')) {
      const currentPos = currentPoints.length >= 2 ? { x: currentPoints[currentPoints.length - 2], y: currentPoints[currentPoints.length - 1] } : startPos;
      const w = currentPos.x - startPos.x;
      const h = currentPos.y - startPos.y;

      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.fillStyle = selectedFill;
      ctx.lineWidth = strokeWidth;

      if (activeTool === 'rectangle') {
        ctx.beginPath();
        ctx.rect(startPos.x, startPos.y, w, h);
        if (selectedFill !== 'transparent') ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'circle') {
        ctx.beginPath();
        ctx.ellipse(startPos.x + w / 2, startPos.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
        if (selectedFill !== 'transparent') ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'line' || activeTool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [elements, zoomLevel, gridPattern, selectedElementId, isDrawing, activeTool, currentPoints, startPos, selectedColor, selectedFill, strokeWidth]);

  // Sync Canvas size with container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        renderCanvas();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // --- MOUSE EVENT HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    setStartPos(coords);
    setIsDrawing(true);

    if (activeTool === 'select') {
      // Find element clicked
      const clicked = [...elements].reverse().find((elem) => {
        if (elem.type === 'rectangle' || elem.type === 'sticky') {
          return (
            coords.x >= elem.x &&
            coords.x <= elem.x + (elem.width || 100) &&
            coords.y >= elem.y &&
            coords.y <= elem.y + (elem.height || 100)
          );
        } else if (elem.type === 'circle') {
          const rx = Math.abs((elem.width || 80) / 2);
          const ry = Math.abs((elem.height || 80) / 2);
          const cx = elem.x + rx;
          const cy = elem.y + ry;
          return Math.pow(coords.x - cx, 2) / (rx * rx) + Math.pow(coords.y - cy, 2) / (ry * ry) <= 1;
        } else if (elem.type === 'text') {
          return coords.x >= elem.x && coords.x <= elem.x + 150 && coords.y >= elem.y && coords.y <= elem.y + 30;
        }
        return false;
      });

      if (clicked) {
        setSelectedElementId(clicked.id);
        setDragOffset({ x: coords.x - clicked.x, y: coords.y - clicked.y });
      } else {
        setSelectedElementId(null);
      }
    } else if (activeTool === 'eraser') {
      // Find element under eraser and delete it
      const toDelete = elements.find((elem) => Math.abs(elem.x - coords.x) < 30 && Math.abs(elem.y - coords.y) < 30);
      if (toDelete) {
        onDeleteElement(toDelete.id);
      }
    } else if (activeTool === 'pen') {
      setCurrentPoints([coords.x, coords.y]);
    } else if (activeTool === 'text') {
      const newElem: CanvasElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: coords.x,
        y: coords.y,
        stroke: selectedColor,
        fill: 'transparent',
        strokeWidth: 1,
        text: 'Click to Edit Text',
        fontSize: 20,
        updatedAt: Date.now(),
        updatedBy: currentUser.name,
      };
      onUpsertElement(newElem);
      setSelectedElementId(newElem.id);
      setIsDrawing(false);
    } else if (activeTool === 'sticky') {
      const newElem: CanvasElement = {
        id: `sticky-${Date.now()}`,
        type: 'sticky',
        x: coords.x,
        y: coords.y,
        width: 150,
        height: 150,
        stroke: '#f59e0b',
        fill: '#fef08a',
        strokeWidth: 1,
        text: 'Architecture Note',
        updatedAt: Date.now(),
        updatedBy: currentUser.name,
      };
      onUpsertElement(newElem);
      setSelectedElementId(newElem.id);
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);

    // Throttle cursor emission
    const now = Date.now();
    if (now - lastCursorEmit.current > 40) {
      onCursorMove(coords);
      lastCursorEmit.current = now;
    }

    if (!isDrawing) return;

    if (activeTool === 'select' && selectedElementId && dragOffset) {
      const elem = elements.find((e) => e.id === selectedElementId);
      if (elem) {
        const updated: CanvasElement = {
          ...elem,
          x: coords.x - dragOffset.x,
          y: coords.y - dragOffset.y,
          updatedAt: Date.now(),
          updatedBy: currentUser.name,
        };
        onUpsertElement(updated);
      }
    } else if (activeTool === 'pen') {
      setCurrentPoints((prev) => [...prev, coords.x, coords.y]);
    } else if (startPos) {
      setCurrentPoints([startPos.x, startPos.y, coords.x, coords.y]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoordinates(e);
    setIsDrawing(false);

    if (activeTool === 'pen' && currentPoints.length >= 4) {
      const newElem: CanvasElement = {
        id: `pen-${Date.now()}`,
        type: 'pen',
        x: currentPoints[0],
        y: currentPoints[1],
        points: currentPoints,
        stroke: selectedColor,
        fill: 'transparent',
        strokeWidth,
        updatedAt: Date.now(),
        updatedBy: currentUser.name,
      };
      onUpsertElement(newElem);
    } else if (startPos && (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'arrow' || activeTool === 'line')) {
      const width = coords.x - startPos.x;
      const height = coords.y - startPos.y;

      if (Math.abs(width) > 5 || Math.abs(height) > 5) {
        const newElem: CanvasElement = {
          id: `${activeTool}-${Date.now()}`,
          type: activeTool,
          x: startPos.x,
          y: startPos.y,
          width,
          height,
          stroke: selectedColor,
          fill: selectedFill,
          strokeWidth,
          updatedAt: Date.now(),
          updatedBy: currentUser.name,
        };
        onUpsertElement(newElem);
      }
    }

    setCurrentPoints([]);
    setStartPos(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    const target = elements.find(
      (elem) =>
        (elem.type === 'text' || elem.type === 'sticky') &&
        coords.x >= elem.x &&
        coords.x <= elem.x + (elem.width || 150) &&
        coords.y >= elem.y &&
        coords.y <= elem.y + (elem.height || 150)
    );

    if (target) {
      setEditingTextId(target.id);
      setTextInputValue(target.text || '');
    }
  };

  const handleSaveTextEdit = () => {
    if (editingTextId) {
      const elem = elements.find((e) => e.id === editingTextId);
      if (elem) {
        onUpsertElement({
          ...elem,
          text: textInputValue,
          updatedAt: Date.now(),
          updatedBy: currentUser.name,
        });
      }
      setEditingTextId(null);
    }
  };

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `syncspace-whiteboard-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden select-none flex flex-col">
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1">
        {/* Tools */}
        <div className="flex items-center gap-1 border-r border-slate-800 pr-1.5">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              activeTool === 'select' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Select & Move (V)"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              activeTool === 'pen' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Freehand Pen (P)"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('rectangle')}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              activeTool === 'rectangle' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Rectangle (R)"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('circle')}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              activeTool === 'circle' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Circle / Ellipse (C)"
          >
            <CircleIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('arrow')}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              activeTool === 'arrow' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Arrow Connection (A)"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('sticky')}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              activeTool === 'sticky' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Sticky Note (S)"
          >
            <StickyNote className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              activeTool === 'text' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Text Label (T)"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              activeTool === 'eraser' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1 border-r border-slate-800 px-1.5">
          {COLORS.slice(0, 5).map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-5 h-5 rounded-full ring-2 transition-transform ${
                selectedColor === color ? 'ring-white scale-110' : 'ring-transparent opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Fill Toggle */}
        <div className="flex items-center gap-1 border-r border-slate-800 px-1.5">
          <button
            onClick={() => setSelectedFill(selectedFill === 'transparent' ? `${selectedColor}33` : 'transparent')}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${
              selectedFill !== 'transparent' ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'border-slate-700 text-slate-400'
            }`}
          >
            Fill
          </button>
        </div>

        {/* Delete / Clear */}
        <div className="flex items-center gap-1 pl-1">
          {selectedElementId && (
            <button
              onClick={() => {
                onDeleteElement(selectedElementId);
                setSelectedElementId(null);
              }}
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/60 transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {onOpenAiGenerator && (
            <button
              onClick={onOpenAiGenerator}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-medium shadow transition-all"
              title="Generate Architecture via AI Prompt"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>AI Diagram</span>
            </button>
          )}

          <button
            onClick={onClearCanvas}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Clear Whiteboard"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Canvas View Controls (Zoom, Grid, PNG Export) */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-1 flex items-center gap-1 shadow-lg text-slate-400">
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 2.5))}
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.5))}
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-3 w-px bg-slate-800 mx-1" />
        <button
          onClick={() =>
            setGridPattern(gridPattern === 'dots' ? 'grid' : gridPattern === 'grid' ? 'blank' : 'dots')
          }
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 text-xs"
          title="Toggle Grid Style"
        >
          <Grid className="w-4 h-4" />
          <span className="capitalize text-[10px]">{gridPattern}</span>
        </button>
        <div className="h-3 w-px bg-slate-800 mx-1" />
        <button
          onClick={handleExportPNG}
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded text-xs flex items-center gap-1"
          title="Download Canvas PNG"
        >
          <Download className="w-4 h-4" />
          <span className="text-[10px]">PNG</span>
        </button>
      </div>

      {/* Remote Users Live Cursors Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {remoteUsers.map((u) => {
          if (!u.cursor || (u.cursor.x === 0 && u.cursor.y === 0)) return null;
          return (
            <div
              key={u.id}
              className="absolute transition-all duration-75 ease-out flex items-center gap-1"
              style={{
                transform: `translate(${u.cursor.x * zoomLevel}px, ${u.cursor.y * zoomLevel}px)`,
              }}
            >
              <MousePointer
                className="w-4 h-4 fill-current drop-shadow"
                style={{ color: u.color }}
              />
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white shadow-md"
                style={{ backgroundColor: u.color }}
              >
                {u.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Canvas HTML Element */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* Text Editing Inline Overlay Input */}
      {editingTextId && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl flex flex-col gap-2 w-80">
          <span className="text-xs font-medium text-slate-300">Edit Note / Label Text</span>
          <textarea
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            rows={3}
            autoFocus
            className="w-full bg-slate-950 text-slate-100 p-2 rounded-lg border border-slate-800 text-sm focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingTextId(null)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTextEdit}
              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg font-medium shadow"
            >
              Save Text
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
