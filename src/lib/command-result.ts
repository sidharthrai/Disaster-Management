export async function runCommandWithRefresh<T>(mutate: () => Promise<T>, refresh: () => Promise<void>): Promise<{ result: T; refreshed: boolean }> {
  const result = await mutate();
  try { await refresh(); return { result, refreshed: true }; }
  catch { return { result, refreshed: false }; }
}
