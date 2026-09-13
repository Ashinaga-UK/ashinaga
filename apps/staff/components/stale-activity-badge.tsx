import { Badge } from './ui/badge';

export function StaleActivityBadge({ stale }: { stale?: boolean }) {
  if (!stale) return null;
  return <Badge variant="outline">No recent activity</Badge>;
}
