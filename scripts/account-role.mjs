import Database from 'better-sqlite3';
import { resolve } from 'node:path';

const [id, role, ...args] = process.argv.slice(2);
const verify = args.includes('--verify');
const categories = args.filter(value => value !== '--verify');
const allowed = ['Groceries', 'Transport', 'Supplies', 'Community', 'Shelter', 'Medical', 'Missing person'];
if (process.env.APP_MODE !== 'accounts' || !/^account:.+/.test(id || '') || !['member', 'coordinator', 'organization'].includes(role) || args.filter(value => value === '--verify').length > 1 || categories.some(value => !allowed.includes(value)) || new Set(categories).size !== categories.length || (role !== 'organization' && categories.length) || (verify && role !== 'organization')) {
  throw new Error('Usage in account mode: account:<user-id> <member|coordinator|organization> [category ...] [--verify]; qualifications and verification require organization role.');
}
const db = new Database(resolve(process.env.DATABASE_PATH || 'data/accounts-community.sqlite'), { fileMustExist: true });
try {
  db.pragma('busy_timeout = 5000');
  db.transaction(() => {
    const settings = db.prepare("SELECT payload FROM settings WHERE id = 'community'").get();
    if (!settings || JSON.parse(settings.payload).clockMode !== 'live') throw new Error('Expected an initialized live dataset.');
    const row = db.prepare('SELECT payload FROM users WHERE id = ?').get(id);
    const user = row && JSON.parse(row.payload);
    if (!user || user.id !== id || user.synthetic !== false) throw new Error('No mapped account found. The user must sign in first.');
    user.role = role;
    user.qualifiedCategories = categories;
    if (verify) user.verified = true;
    else if (role !== 'organization') user.verified = false;
    db.prepare('UPDATE users SET payload = ? WHERE id = ?').run(JSON.stringify(user), id);
  }).immediate();
} finally { db.close(); }
process.stdout.write('Account role and qualifications updated. Review existing commitments and resources after changing eligibility; historical links remain in place.\n');
