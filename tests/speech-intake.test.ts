import { describe, expect, it, vi } from 'vitest';
import { SpeechIntakeController, type RecognitionLike, type RecognitionResultEvent } from '../src/lib/speech-intake';

class FakeRecognition implements RecognitionLike {
  lang = ''; continuous = false; interimResults = false;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: RecognitionResultEvent) => void) | null = null;
  start = vi.fn(); stop = vi.fn(); abort = vi.fn();
}

function result(text: string, isFinal = true) { return { 0: { transcript: text }, isFinal }; }

describe('browser speech intake', () => {
  it('starts only on request and emits each final result once, never interim text', () => {
    const recognition = new FakeRecognition(); const transcript = vi.fn(); const state = vi.fn();
    const controller = new SpeechIntakeController(() => recognition, transcript, state);
    expect(recognition.start).not.toHaveBeenCalled();
    controller.start('es-ES');
    expect(recognition.lang).toBe('es-ES'); expect(recognition.start).toHaveBeenCalledOnce();
    recognition.onstart?.();
    recognition.onresult?.({ resultIndex: 0, results: [result('partial', false)] });
    recognition.onresult?.({ resultIndex: 0, results: [result('hola')] });
    recognition.onresult?.({ resultIndex: 0, results: [result('hola'), result(' vecino')] });
    expect(transcript.mock.calls).toEqual([['hola'], ['vecino']]);
    controller.stop(); expect(recognition.stop).toHaveBeenCalledOnce();
    recognition.onend?.(); expect(state).toHaveBeenLastCalledWith({ kind: 'idle' });
  });
  it('discards late results after cancellation and detaches handlers on disposal', () => {
    const recognition = new FakeRecognition(); const transcript = vi.fn();
    const controller = new SpeechIntakeController(() => recognition, transcript, vi.fn());
    controller.start('en-US'); const queuedResult = recognition.onresult; controller.cancel();
    queuedResult?.({ resultIndex: 0, results: [result('late')] });
    expect(transcript).not.toHaveBeenCalled(); expect(recognition.abort).toHaveBeenCalledOnce();
    controller.dispose(); expect(recognition.onresult).toBeNull();
  });
  it.each(['not-allowed', 'no-speech', 'network'])('keeps the %s error after recognition ends', error => {
    const recognition = new FakeRecognition(); const state = vi.fn();
    const controller = new SpeechIntakeController(() => recognition, vi.fn(), state);
    controller.start('en-US'); recognition.onerror?.({ error }); recognition.onend?.();
    expect(state).toHaveBeenLastCalledWith({ kind: 'error', error });
  });
  it('reports unsupported browsers without starting recognition', () => {
    const state = vi.fn(); const controller = new SpeechIntakeController(null, vi.fn(), state);
    controller.start('en-US'); expect(state).toHaveBeenLastCalledWith({ kind: 'unsupported' });
  });
});
