import { network } from '@/server/services';
import { appMode } from '@/server/runtime-mode';
import { HomeView } from '@/components/home-view';

export const dynamic = 'force-dynamic';
export default function Home() {
  return <HomeView overview={network().publicOverview()} demo={appMode() === 'demo'} />;
}
