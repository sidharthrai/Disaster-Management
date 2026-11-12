'use client';

import { Microphone, Stop } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { browserRecognitionFactory, SpeechIntakeController, type SpeechIntakeState } from '@/lib/speech-intake';
import { Button } from './ui';
import { useLocale } from './locale-context';

function errorMessage(error: string) {
  switch (error) {
    case 'not-allowed': case 'service-not-allowed': return 'Microphone permission or speech recognition was denied. You can paste text instead.';
    case 'no-speech': return 'No speech was heard. Try again or paste text instead.';
    case 'audio-capture': return 'No microphone was available. Check your microphone or paste text instead.';
    case 'network': return 'The browser speech service could not connect. Try again or paste text instead.';
    default: return 'Speech recognition stopped unexpectedly. Try again or paste text instead.';
  }
}

export function VoiceIntakeButton({ onTranscript, disabled = false, language = 'en-US' }: { onTranscript: (text: string) => void; disabled?: boolean; language?: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<SpeechIntakeState>({ kind: 'idle' });
  const controller = useRef<SpeechIntakeController | null>(null);
  const latest = useRef({ onTranscript, disabled });
  latest.current = { onTranscript, disabled };

  useEffect(() => {
    const factory = browserRecognitionFactory();
    const next = new SpeechIntakeController(factory, text => {
      if (!latest.current.disabled) latest.current.onTranscript(text);
    }, setState);
    controller.current = next;
    if (!factory) setState({ kind: 'unsupported' });
    return () => { controller.current = null; next.dispose(); };
  }, []);

  useEffect(() => { if (disabled) controller.current?.cancel(); }, [disabled]);

  const active = state.kind === 'starting' || state.kind === 'listening' || state.kind === 'stopping';
  return <div className="space-y-3">
    <p className="text-sm text-muted">{t('Optional voice input: your browser may process speech through its own service. Your browser will request microphone permission when you choose to start. You can always type or paste text instead.')}</p>
    {state.kind !== 'unsupported' && <div className="flex flex-wrap gap-2">
      {!active ? <Button type="button" secondary disabled={disabled} onClick={() => controller.current?.start(language)}><Microphone size={18} /> {t('Start voice input')}</Button> : <><Button type="button" secondary disabled={disabled || state.kind === 'stopping'} onClick={() => controller.current?.stop()}><Stop size={18} /> {t('Stop and keep transcript')}</Button><Button type="button" secondary disabled={disabled} onClick={() => controller.current?.cancel()}>{t('Cancel listening')}</Button></>}
    </div>}
    <p className="text-sm text-muted" role="status" aria-live="polite">{state.kind === 'unsupported' ? t('Voice input is not available in this browser. Type or paste text instead.') : state.kind === 'starting' ? t('Starting voice input…') : state.kind === 'listening' ? t('Listening…') : state.kind === 'stopping' ? t('Finishing voice input…') : state.kind === 'error' ? t(errorMessage(state.error)) : t('Voice input is off.')}</p>
  </div>;
}
