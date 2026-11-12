from pathlib import Path
import json
import sys
import subprocess
import numpy as np
from faster_whisper import WhisperModel

class VoiceVerification:
    def run(self):
        root = Path(__file__).parent
        model = WhisperModel('base', device='cpu', compute_type='int8', local_files_only=True)
        raw = subprocess.run(['ffmpeg','-v','error','-i',str(root/(sys.argv[1] if len(sys.argv)>1 else 'composition/assets/voiceover.wav')),'-f','f32le','-ar','16000','-ac','1','-'],capture_output=True,check=True).stdout
        samples = np.frombuffer(raw,dtype=np.float32)
        segments, info = model.transcribe(samples, language='en', word_timestamps=True)
        data = [{'start':s.start,'end':s.end,'text':s.text,'words':[{'word':w.word,'start':w.start,'end':w.end} for w in s.words]} for s in segments]
        (root/('final-video-transcript.json' if len(sys.argv)>1 else 'narration-transcript.json')).write_text(json.dumps(data,indent=2))
        for segment in data:
            print(f"{segment['start']:.2f}-{segment['end']:.2f} {segment['text']}")

VoiceVerification().run()
