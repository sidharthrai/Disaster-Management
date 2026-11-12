export interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => RecognitionLike;
declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export type SpeechIntakeState =
  | { kind: 'idle' | 'starting' | 'listening' | 'stopping' | 'unsupported' }
  | { kind: 'error'; error: string };

type RecognitionFactory = () => RecognitionLike;

export function browserRecognitionFactory(): RecognitionFactory | null {
  if (typeof window === 'undefined') return null;
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  return Recognition ? () => new Recognition() : null;
}

export class SpeechIntakeController {
  private recognition: RecognitionLike | null = null;
  private state: SpeechIntakeState = { kind: 'idle' };
  private accepted = new Set<number>();
  private cancelled = false;

  constructor(
    private readonly factory: RecognitionFactory | null,
    private readonly onTranscript: (text: string) => void,
    private readonly onState: (state: SpeechIntakeState) => void,
  ) {}

  private changeState(state: SpeechIntakeState) { this.state = state; this.onState(state); }

  start(language: string) {
    if (this.recognition) return;
    if (!this.factory) { this.changeState({ kind: 'unsupported' }); return; }
    this.cancelled = false;
    this.accepted.clear();
    try {
      const recognition = this.factory();
      this.recognition = recognition;
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onstart = () => { if (this.recognition === recognition && this.state.kind === 'starting') this.changeState({ kind: 'listening' }); };
      recognition.onresult = event => {
        if (this.cancelled || this.recognition !== recognition) return;
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index];
          if (!result?.isFinal || this.accepted.has(index)) continue;
          this.accepted.add(index);
          const text = result[0]?.transcript.trim();
          if (text) this.onTranscript(text);
        }
      };
      recognition.onerror = event => { if (!this.cancelled && this.recognition === recognition) this.changeState({ kind: 'error', error: event.error }); };
      recognition.onend = () => {
        if (this.recognition !== recognition) return;
        this.detach(recognition);
        if (this.recognition === recognition) this.recognition = null;
        if (this.state.kind !== 'error') this.changeState({ kind: 'idle' });
      };
      this.changeState({ kind: 'starting' });
      recognition.start();
    } catch {
      if (this.recognition) this.detach(this.recognition);
      this.recognition = null;
      this.changeState({ kind: 'error', error: 'start-failed' });
    }
  }

  stop() {
    if (!this.recognition || this.state.kind === 'stopping') return;
    this.changeState({ kind: 'stopping' });
    try { this.recognition.stop(); } catch { this.cancel(); }
  }

  cancel() {
    const recognition = this.recognition;
    if (!recognition) return;
    this.cancelled = true;
    this.detach(recognition);
    this.recognition = null;
    try { recognition.abort(); } catch { /* The browser may already have stopped. */ }
    this.changeState({ kind: 'idle' });
  }

  dispose() {
    const recognition = this.recognition;
    this.cancelled = true;
    if (!recognition) return;
    this.detach(recognition);
    this.recognition = null;
    try { recognition.abort(); } catch { /* The browser may already have stopped. */ }
  }

  private detach(recognition: RecognitionLike) {
    recognition.onstart = null; recognition.onend = null;
    recognition.onerror = null; recognition.onresult = null;
  }
}
