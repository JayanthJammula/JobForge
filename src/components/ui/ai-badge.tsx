import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

interface AIMeta {
  model_used?: string;
  generated_at?: string;
  latency_ms?: number;
  fallback_used?: boolean;
}

interface AIBadgeProps {
  meta?: AIMeta;
  className?: string;
}

export function AIBadge({ meta, className = "" }: AIBadgeProps) {
  const badge = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      AI-generated
    </span>
  );

  if (!meta?.model_used) return badge;

  const modelShort = meta.model_used.replace("models/", "");
  const time = meta.generated_at
    ? new Date(meta.generated_at).toLocaleTimeString()
    : "";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div>Model: {modelShort}</div>
          {meta.latency_ms != null && <div>Latency: {meta.latency_ms}ms</div>}
          {time && <div>Generated: {time}</div>}
          {meta.fallback_used && (
            <div className="text-amber-500">Fallback model used</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
