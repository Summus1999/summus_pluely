import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * Card - 卡片容器组件
 *
 * 用于内容分组的容器组件
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>标题</CardTitle>
 *   </CardHeader>
 *   <CardContent>内容</CardContent>
 * </Card>
 */
export const Card = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card/80 text-card-foreground flex flex-col gap-6 rounded-xl border border-secondary/30 py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

/**
 * CardHeader - 卡片头部组件
 */
export const CardHeader = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

/**
 * CardTitle - 卡片标题组件
 */
export const CardTitle = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

/**
 * CardDescription - 卡片描述组件
 */
export const CardDescription = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/**
 * CardAction - 卡片操作区域组件
 */
export const CardAction = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

/**
 * CardContent - 卡片内容组件
 */
export const CardContent = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

/**
 * CardFooter - 卡片底部组件
 */
export const CardFooter = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}


