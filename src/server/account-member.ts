import { UserSchema } from '../domain/model';
import { repository } from './services';

/** Map an authenticated user to the same ordinary community member on every request. */
export function mapAccount(user: { id: string; name: string }): string {
  const id = `account:${user.id}`;
  repository().transaction(state => {
    if (state.users.some(member => member.id === id)) return;
    const name = user.name.trim() || 'Neighbor';
    state.users.push(UserSchema.parse({
      id, name, role: 'member', communityId: 'riverton', area: 'Central Park',
      initials: name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase(),
      color: 'sage', verified: false, synthetic: false, qualifiedCategories: [],
    }));
  });
  return id;
}
