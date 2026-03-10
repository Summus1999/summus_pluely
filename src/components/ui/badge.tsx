import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

/**
 * Badge 样式变体配置
 *
 * @property variant - 徽章样式变体（default, secondary, destructive, outline）
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Badge 组件属性
 */
interface BadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** 是否作为子元素渲染 */
  asChild?: boolean
}

/**
 * Badge - 徽章组件
 *
 * 用于显示状态、标签或计数的小型视觉元素
 *
 * @example
 * <Badge>默认</Badge>
 * <Badge variant="secondary">次要</Badge>
 * <Badge variant="destructive">删除</Badge>
 */
export const Badge = ({
  className,
  variant,
  asChild = false,
  ...props
}: BadgeProps) => {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { badgeVariants }
