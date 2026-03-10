import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * Empty 组件 - 空状态展示组件
 *
 * 用于显示空状态、无数据或占位内容
 *
 * @example
 * <Empty>
 *   <EmptyMedia><Icon /></EmptyMedia>
 *   <EmptyTitle>暂无数据</EmptyTitle>
 *   <EmptyDescription>请添加一些内容</EmptyDescription>
 * </Empty>
 */
export const EmptyComponent = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12",
        className
      )}
      {...props}
    />
  );
}

/**
 * EmptyHeader - 空状态头部
 */
export const EmptyHeader = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className
      )}
      {...props}
    />
  );
}

/**
 * EmptyMedia 样式变体配置
 * @property variant - 媒体变体（default, icon）
 */
const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * EmptyMedia - 空状态媒体区域
 */
export const EmptyMedia = ({
  className,
  variant = "default",
  ...props
}: ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) => {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

/**
 * EmptyTitle - 空状态标题
 */
export const EmptyTitle = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-lg font-medium tracking-tight", className)}
      {...props}
    />
  );
}

/**
 * EmptyDescription - 空状态描述
 */
export const EmptyDescription = ({ className, ...props }: ComponentProps<"p">) => {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  );
}

/**
 * EmptyContent - 空状态内容区域
 */
export const EmptyContent = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance",
        className
      )}
      {...props}
    />
  );
}


