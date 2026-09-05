"use client";

import React, { useState, useEffect } from "react";

export function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
  if (startIndex === endIndex) return list;
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export interface SortableListProps<T> {
  items: T[];
  keyExtractor: (item: T, index: number) => string;
  onReorder: (sourceIndex: number, targetIndex: number) => void;
  className?: string;
  children: (
    item: T,
    index: number,
    handleProps: {
      onPointerDown: (e: React.PointerEvent) => void;
      className: string;
      style?: React.CSSProperties;
    },
    isDragging: boolean
  ) => React.ReactNode;
}

export function SortableList<T>({
  items,
  keyExtractor,
  onReorder,
  className = "",
  children,
}: SortableListProps<T>) {
  const [dragState, setDragState] = useState<{
    draggingIndex: number;
    hoverIndex: number;
    translateY: number;
    displacement: number;
    startY: number;
    rects: { top: number; bottom: number; height: number; midY: number }[];
  } | null>(null);

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    // Only primary mouse button or touch
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const handleEl = e.currentTarget as HTMLElement;
    const container = handleEl.closest("[data-sortable-container]") as HTMLElement;
    if (!container) return;

    const childElements = Array.from(container.children) as HTMLElement[];
    const rects = childElements.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        midY: r.top + r.height / 2,
      };
    });

    const dragItemHeight = rects[index]?.height ?? 50;
    let gap = 8;
    if (rects.length > 1 && rects[0] && rects[1]) {
      gap = Math.max(0, rects[1].top - rects[0].bottom);
    }

    setDragState({
      draggingIndex: index,
      hoverIndex: index,
      translateY: 0,
      displacement: dragItemHeight + gap,
      startY: e.clientY,
      rects,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const onPointerMove = (e: PointerEvent) => {
      const deltaY = e.clientY - dragState.startY;
      const rects = dragState.rects;
      if (!rects || rects.length <= 1) return;

      const currentDragIndex = dragState.draggingIndex;
      const currentItemMid = (rects[currentDragIndex]?.midY ?? 0) + deltaY;

      let newHoverIndex = currentDragIndex;
      for (let i = 0; i < rects.length; i++) {
        if (i === currentDragIndex) continue;
        const targetRect = rects[i];
        if (!targetRect) continue;

        if (deltaY > 0) {
          if (currentItemMid > targetRect.midY) {
            newHoverIndex = Math.max(newHoverIndex, i);
          }
        } else if (deltaY < 0) {
          if (currentItemMid < targetRect.midY) {
            newHoverIndex = Math.min(newHoverIndex, i);
          }
        }
      }

      newHoverIndex = Math.max(0, Math.min(rects.length - 1, newHoverIndex));

      setDragState((prev) =>
        prev ? { ...prev, hoverIndex: newHoverIndex, translateY: deltaY } : null
      );
    };

    const onPointerUp = () => {
      if (dragState.draggingIndex !== dragState.hoverIndex) {
        onReorder(dragState.draggingIndex, dragState.hoverIndex);
      }
      setDragState(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragState, onReorder]);

  return (
    <div data-sortable-container="true" className={`relative ${className}`}>
      {items.map((item, index) => {
        const key = keyExtractor(item, index);
        const isDragging = dragState?.draggingIndex === index;
        const draggingIndex = dragState?.draggingIndex ?? -1;
        const hoverIndex = dragState?.hoverIndex ?? -1;
        const displacement = dragState?.displacement ?? 0;

        let translateY = 0;
        let transition = "transform 220ms cubic-bezier(0.2, 0, 0, 1)";
        let zIndex = 1;

        if (isDragging) {
          translateY = dragState?.translateY ?? 0;
          transition = "none";
          zIndex = 50;
        } else if (draggingIndex !== -1 && hoverIndex !== -1 && displacement > 0) {
          if (draggingIndex < hoverIndex) {
            if (index > draggingIndex && index <= hoverIndex) {
              translateY = -displacement;
            }
          } else if (draggingIndex > hoverIndex) {
            if (index >= hoverIndex && index < draggingIndex) {
              translateY = displacement;
            }
          }
        }

        const handleProps = {
          onPointerDown: (e: React.PointerEvent) => handlePointerDown(index, e),
          className:
            "cursor-grab active:cursor-grabbing hover:text-foreground text-text-muted transition-colors p-1 rounded select-none touch-none",
          style: { touchAction: "none" as const },
        };

        return (
          <div
            key={key}
            style={{
              transform: translateY !== 0 ? `translate3d(0, ${translateY}px, 0)` : undefined,
              transition: dragState ? transition : undefined,
              zIndex,
            }}
            className={`relative ${isDragging
                ? "shadow-2xl ring-2 ring-primary/70 rounded-3xl bg-surface/95 backdrop-blur-sm opacity-95 scale-[1.01]"
                : ""
              }`}
          >
            {children(item, index, handleProps, isDragging)}
          </div>
        );
      })}
    </div>
  );
}
