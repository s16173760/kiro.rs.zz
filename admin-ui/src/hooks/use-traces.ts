import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getTraces } from '@/api/traces'
import type { TraceQuery } from '@/types/api'

/**
 * 请求链路查询 hook
 *
 * 复用与 stats 一致的刷新策略：30s 自动刷新、切换筛选时保留旧数据避免闪烁。
 * `enabled=false` 时不发请求（用于弹框未打开时的懒加载）。
 */
export function useTraces(query: TraceQuery, enabled = true) {
  return useQuery({
    queryKey: ['traces', query],
    queryFn: () => getTraces(query),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  })
}
