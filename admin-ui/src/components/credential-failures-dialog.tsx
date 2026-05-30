import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTraces } from "@/hooks/use-traces";
import type { TraceRecord } from "@/types/api";

interface CredentialFailuresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialId: number;
  email?: string;
}

/** 失败分类 → 中文标签 + Badge 颜色 */
function outcomeStyle(outcome: string | null): {
  label: string;
  variant: "destructive" | "warning" | "outline" | "secondary";
} {
  switch (outcome) {
    case "quota_exhausted":
      return { label: "额度耗尽", variant: "warning" };
    case "account_throttled":
      return { label: "账号风控", variant: "warning" };
    case "auth_failed":
      return { label: "鉴权失败", variant: "destructive" };
    case "transient":
      return { label: "瞬态错误", variant: "outline" };
    case "network_error":
      return { label: "网络错误", variant: "destructive" };
    case "bad_request":
      return { label: "请求错误", variant: "destructive" };
    case "stream_interrupted":
      return { label: "流中断", variant: "warning" };
    default:
      return { label: outcome || "未知", variant: "secondary" };
  }
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function CredentialFailuresDialog({
  open,
  onOpenChange,
  credentialId,
  email,
}: CredentialFailuresDialogProps) {
  const { data, isLoading } = useTraces(
    { credentialId, onlyFailed: true, limit: 50 },
    open,
  );
  const records = data?.records ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>失败日志详情</DialogTitle>
          <DialogDescription>
            {email || `凭据 #${credentialId}`} 最近的失败请求（最多 50 条）
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              加载中…
            </div>
          ) : records.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              该凭据暂无失败记录（trace 关闭或近期无失败）。
            </div>
          ) : (
            records.map((rec) => <FailureRow key={rec.traceId} rec={rec} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 单条失败链路：取该凭据命中的那一跳错误体展示 */
function FailureRow({ rec }: { rec: TraceRecord }) {
  const style = outcomeStyle(rec.errorType);
  // 找该卡片对应凭据的那一跳（优先 finalCredentialId 命中跳），取错误体片段
  const attempt =
    rec.attempts.find(
      (a) => a.credentialId === rec.finalCredentialId && a.errorSnippet,
    ) || rec.attempts.find((a) => a.errorSnippet);
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="tabular-nums text-muted-foreground">
          {formatTime(rec.ts)}
        </span>
        <Badge variant={style.variant}>{style.label}</Badge>
        {attempt?.httpStatus != null && (
          <span className="font-mono text-muted-foreground">
            HTTP {attempt.httpStatus}
          </span>
        )}
        {rec.finalStatus === "interrupted" && (
          <Badge variant="warning">中断</Badge>
        )}
        <span className="ml-auto text-[12px] text-muted-foreground">
          尝试 {rec.totalAttempts} 次 · {rec.model}
        </span>
      </div>
      {rec.errorMessage && (
        <div className="mt-1.5 text-[12px] text-destructive">
          {rec.errorMessage}
        </div>
      )}
      {attempt?.errorSnippet && (
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background/60 p-2 font-mono text-[11px] text-muted-foreground">
          {attempt.errorSnippet}
        </pre>
      )}
    </div>
  );
}
