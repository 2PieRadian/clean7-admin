"use client";

import React, { useState, useRef } from "react";
import { GripVertical, ChevronUp, ChevronDown } from "lucide-react";

export function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
  if (startIndex === endIndex) return list;
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

// Module-level ref to track active dragging handle so that clicking other elements on the item doesn't trigger drag
let currentActiveDragGroupId: string | null = null;
let currentActiveDragIndex: number | null = null;

export interface SortableItemProps {
  id: string;
  index: number;
  groupId: string;
  onReorder: (sourceIndex: number, targetIndex: number) => void;
  className?: string;
  children: React.ReactNode;
}

export function SortableItem({
  id,
  index,
  groupId,
  onReorder,
  className = "",
  children,
}: SortableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCanStart, setDragCanStart] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dragCanStart) {
      e.preventDefault();
      return;
    }

    currentActiveDragGroupId = groupId;
    currentActiveDragIndex = index;

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ index, groupId, id })
    );

    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (currentActiveDragGroupId !== groupId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver && currentActiveDragIndex !== index) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the item bounds
    if (itemRef.current && !itemRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsDragging(false);
    setDragCanStart(false);

    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.groupId === groupId && typeof data.index === "number") {
        if (data.index !== index) {
          onReorder(data.index, index);
        }
      }
    } catch {
      // ignore parsing error
    } finally {
      currentActiveDragGroupId = null;
      currentActiveDragIndex = null;
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDragOver(false);
    setDragCanStart(false);
    currentActiveDragGroupId = null;
    currentActiveDragIndex = null;
  };

  return (
    <div
      ref={itemRef}
      draggable={dragCanStart}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`relative transition-all duration-150 ${className} ${isDragging ? "opacity-35 scale-[0.99] ring-2 ring-primary/40 border-dashed" : ""
        } ${isDragOver
          ? "ring-2 ring-primary bg-primary/5 shadow-md -translate-y-0.5"
          : ""
        }`}
    >
      {/* Drop Target Indicator Pill */}
      {isDragOver && (
        <div className="absolute -top-1.5 left-4 right-4 h-1 bg-primary rounded-full z-20 pointer-events-none shadow-sm animate-pulse" />
      )}
      {children}
    </div>
  );
}

export interface SortableHandleProps {
  index: number;
  totalCount: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  setDragCanStart?: (can: boolean) => void;
  className?: string;
  showArrows?: boolean;
}

export function SortableHandle({
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  setDragCanStart,
  className = "",
  showArrows = true,
}: SortableHandleProps) {
  return (
    <div
      className={`flex items-center gap-0.5 text-text-muted select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {showArrows && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp?.();
          }}
          disabled={index === 0}
          title="Move Up"
          className="p-1 rounded hover:bg-surface-muted hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
      )}

      <div
        title="Drag to reorder"
        className="p-1 rounded hover:bg-surface-muted hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
        onMouseDown={(e) => {
          // Allow drag only when mouse is pressed down on handle
          const sortableParent = (e.currentTarget as HTMLElement).closest("[draggable]");
          if (sortableParent) {
            sortableParent.setAttribute("draggable", "true");
          }
          setDragCanStart?.(true);
        }}
        onMouseUp={() => {
          setDragCanStart?.(false);
        }}
        onTouchStart={() => {
          setDragCanStart?.(true);
        }}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {showArrows && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown?.();
          }}
          disabled={index >= totalCount - 1}
          title="Move Down"
          className="p-1 rounded hover:bg-surface-muted hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
