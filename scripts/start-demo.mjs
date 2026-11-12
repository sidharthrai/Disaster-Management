process.env.NEXT_DIST_DIR = '.next/demo-production';
process.env.PORT ||= '3005';
process.env.APP_MODE ||= 'demo';
await import('./start.mjs');
