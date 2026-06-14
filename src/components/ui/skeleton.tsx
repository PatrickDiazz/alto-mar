import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted motion-safe:animate-shimmer motion-safe:bg-[length:200%_100%] motion-safe:bg-gradient-to-r motion-safe:from-muted motion-safe:via-muted-foreground/10 motion-safe:to-muted motion-reduce:animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
