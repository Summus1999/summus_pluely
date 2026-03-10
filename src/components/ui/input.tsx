import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * Input - 输入框组件
 *
 * 基础文本输入组件，支持自定义样式
 *
 * @example
 * <Input placeholder="请输入内容" />
 * <Input type="password" />
 */
export const Input = ({ className, type, ...props }: ComponentProps<"input">) => {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-primary/50 dark:border-input/80 flex h-9 w-full min-w-0 rounded-xl border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring/60 focus-visible:ring-ring dark:focus-visible:ring-ring/60 focus-visible:ring-[2px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      {...props}
    />
  );
};
