import type { RequestDetail } from '@/domain/network';
import type { Category } from '@/domain/model';

type Request = Pick<RequestDetail['request'], 'needs' | 'area' | 'urgency' | 'windowStart' | 'windowEnd'>;
export type CorrectionDraft = { categories?: Category[]; area?: Request['area']; urgency?: Request['urgency']; start?: string; end?: string };

export function localDate(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function correctionFields(request: Request, draft: CorrectionDraft) {
  const start = draft.start ?? localDate(request.windowStart);
  const end = draft.end ?? localDate(request.windowEnd);
  return { categories: draft.categories ?? request.needs.map(need => need.category), area: draft.area ?? request.area, urgency: draft.urgency ?? request.urgency, start, end, window: correctionWindow(start, end, request.windowStart, request.windowEnd, draft.start !== undefined, draft.end !== undefined) };
}

/** Keep the exact stored instant unless the user actually edits that field. */
export function correctionWindow(start: string, end: string, originalStart: string, originalEnd: string, startEdited: boolean, endEdited: boolean) {
  const from = new Date(startEdited ? start : originalStart);
  const to = new Date(endEdited ? end : originalEnd);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) return null;
  return { windowStart: startEdited ? from.toISOString() : originalStart, windowEnd: endEdited ? to.toISOString() : originalEnd };
}
