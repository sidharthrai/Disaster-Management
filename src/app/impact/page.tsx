import { publicImpact } from '@/domain/impact';
import { appMode } from '@/server/runtime-mode';
import { repository } from '@/server/services';
import { ImpactView } from '@/components/impact-view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function ImpactPage() {
  return <ImpactView impact={publicImpact(repository().read())} demo={appMode() === 'demo'} />;
}
