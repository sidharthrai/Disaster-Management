import { SqliteRepository } from './repository';
import { emptyState, seedState } from '../domain/seed';
import { NetworkService } from '../domain/network';
import { accountConfig, appMode, authPath, operationPath } from './runtime-mode';

const globalServices = globalThis as typeof globalThis & { communityRepository?: SqliteRepository };
export function repository() {
  if (!globalServices.communityRepository) {
    const mode = appMode();
    if (mode === 'accounts') {
      accountConfig();
      if (operationPath() === authPath()) throw new Error('Authentication and operation databases must be separate.');
    }
    const db = new SqliteRepository(operationPath());
    if (!db.hasData()) db.replace(mode === 'accounts' ? emptyState() : seedState());
    const state = db.read();
    if ((mode === 'accounts' && (state.settings.clockMode !== 'live' || state.users.some(user => user.synthetic))) || (mode === 'demo' && state.settings.clockMode !== 'demo')) {
      db.close();
      throw new Error('Database does not match APP_MODE; use a separate database.');
    }
    globalServices.communityRepository = db;
  }
  return globalServices.communityRepository;
}
export const network = () => new NetworkService(repository());
