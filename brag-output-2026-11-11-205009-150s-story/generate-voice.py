from pathlib import Path
import json
import mlx.core as mx
import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load_model

class NarrationJob:
    def __init__(self, directory):
        self.directory = Path(directory)
    def run(self):
        model_path = "/Users/sidharthrai/.cache/huggingface/hub/models--mlx-community--Qwen3-TTS-12Hz-1.7B-VoiceDesign-4bit/snapshots/5c390979e4b93af5f2932f90742ca99c7dd04687"
        model = load_model(model_path)
        mx.random.seed(20261113)
        script = (self.directory / "narration.txt").read_text().strip()
        chunks = list(model.generate(text=script, instruct="A clear American English male narrator with a warm baritone voice. Confident, sincere and brisk conversational delivery. Calm urgency for a disaster response project film. No theatrical drama, no whispering.", language="english"))
        audio = mx.concatenate([c.audio for c in chunks], axis=0)
        mx.eval(audio)
        target = self.directory / "composition/assets/voiceover-raw.wav"
        target.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(target), np.array(audio).reshape(-1), 24000)
        (self.directory / "narration-generation.json").write_text(json.dumps({"engine":"Qwen3-TTS VoiceDesign via mlx-audio", "model":"mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-4bit", "seed":20261113,"seconds":len(audio)/24000,"sample_rate":24000},indent=2))
        print(f"Generated {len(audio)/24000:.3f}s: {target}")

if __name__ == "__main__":
    NarrationJob(Path(__file__).parent).run()
