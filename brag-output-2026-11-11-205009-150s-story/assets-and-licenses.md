# Assets and licenses

## Product material
Community Help Network UI source, the neighborhood illustration, and Geist WOFF2 files are copied from this project. UI captures contain synthetic demonstration records. All video composition material remains local.

## Narration
Qwen3-TTS VoiceDesign, `mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-4bit`, generated locally using the already cached checkpoint and the existing alternate workflow documented in `business/text_to_speech/assets/voices/README.md`. Seed 20261113. A new generic male baritone narrator was generated; no private sample voice or personal recording was used. Exact marketing script is in narration.txt. Generation metadata is in narration-generation.json; verified word timings are in narration-transcript.json. No cloud voice provider, audio playback, microphone, extension connection, or active narration queue was used.

## Music
“Happy Beats / Business Moves Vol. 12” by Sascha Ende, ende.app. CC BY 4.0, https://ende.app/en/standard-license. Credit: Music: Sascha Ende, ende.app (CC BY 4.0). Music is licensed separately from the skill’s code.

## Sound effects
Kenney.nl interface/click assets distributed with the brag skill; CC0/public domain. Only selected local assets are copied into composition/assets/sfx/.

## Runtime
Hyperframes CLI pinned to 0.9.36 in composition/package.json, run through a temporary npm cache. Local GSAP runtime copied from the CLI bundle. No application dependency or user global installation was changed.

## Geographic map

The actual platform map screenshot uses OpenStreetMap tiles. The map crop retains the visible “Leaflet | © OpenStreetMap contributors” attribution. Fictional community markers are illustrative, as shown in the product.
