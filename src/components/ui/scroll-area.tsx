import type { ComponentProps } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

/**
 * 滚动区域组件 - 为溢出内容提供自定义滚动条
 * @example
 * ```tsx
 * <ScrollArea className="h-72 w-48">
 *   <div className="p-4">长内容...</div>
 * </ScrollArea>
 * ```
 */
export const ScrollArea = ({ className, children, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Root>) => {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
};

/**
 * 滚动条组件 - 自定义样式的滚动条
 * @example
 * ```tsx
 * <ScrollBar orientation="vertical" />
 * ```
 */
export const ScrollBar = ({ className, orientation = "vertical", ...props }: ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) => {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
};
