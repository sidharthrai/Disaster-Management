# Launch video report

## Completed deliverables
Video job: `brag-output-2026-11-11-200929/`. Finished video: `brag.mp4` (2,175,788 bytes), poster: `brag.jpg` (118,469 bytes), caption: `share-copy.txt` (230 bytes). All video source, media, plans, and renders are isolated in that directory. Application source, shared dependencies, data, and the narration projects are not modified by the video job.

## Narrator choice and isolation
The browser extension source uses `ws://127.0.0.1:8765` by default (`business/narrate-extension/extension/src/background.ts`). The corresponding `business/text_to_speech/narrate` launcher explicitly starts `--engine kokoro`, and its current sidecar main selects Kokoro or a fake engine. The same project's `assets/voices/README.md` documents a second Qwen3-TTS VoiceDesign setup, with the 1.7B 4-bit checkpoint already cached locally. A narration-filtered process inspection found no active narrator at the time. The alternate Qwen path was used directly to an audio file, with seed 20261111, a temporary dependency environment, and the cached model. It did not start any server, bind 8765, touch extension settings, use a queue, or play through speakers. Metal GPU access required an approved sandbox escalation; no automatic review rejection occurred.

## Voice generation
The generated raw narration is 23.680 seconds at 24 kHz mono. The delivery voice file is normalized to -17 LUFS target, -2 dB true-peak ceiling, and 48 kHz mono PCM. The soundtrack starts the narration at 0.2 seconds, leaving room for a 25-second video. The exact script, generation code and model/seed metadata are in the job folder. Local Whisper transcription verification matched all key narration, including the product name and final line; the transcript with word timings is retained in narration-transcript.json. Scene cuts were adjusted to the verified narration timings.

## Product grounding
Story is ordinary neighborly help → mutual consent and private coordination → a simulated disaster response workspace. Product lead confirmed community check-ins, shelter, transport, resource catalog, and private missing-person tip workflow; the film makes no claim of live alerts, emergency dispatch, professional identity guarantees, or public missing-person search. Product screenshots are labeled Synthetic local demo.

## Skill workflow
The requested brag skill was read in full, with all step references and audio guidance. Current Hyperframes 0.9.36 core, CLI, registry, and media-use instructions were fetched into a temporary local reference checkout. Scaffold attempted to install global skill files, but filesystem sandbox restrictions blocked those writes; no escalation was used for them. All continued authoring uses local job files. The initial component install was immediately relocated from an accidental app-root compositions directory into the video job, and the newly created empty app-root directories were removed.

## Sol-only steering
After the user's explicit Sol-only instruction, the original non-Sol composition worker was immediately interrupted before it wrote composition changes. Remaining composition work is assigned to a fresh explicit gpt-6.1-sol worker. Completed assets and plans are retained.

## Music license
Happy Beats / Business Moves Vol. 12 by Sascha Ende, ende.app, CC BY 4.0. Credit is included in share-copy.txt.

## Final validation
Complete: final fresh English UI captures are used for the everyday dashboard, disaster overview, and shelter/transport section. Hyperframes 0.9.36 check passes with 0 errors in lint, runtime, layout, contrast, and audio; 44 text contrast checks passed. Two reviewed craft warnings concern intentionally small decorative browser title bars, while reading copy and demo labels meet the 28px floor. Each scene was inspected in final snapshots. Local delivery render completed in 17.6 seconds using hardware GPU capture and two workers. The settled final product mosaic at 23.6 seconds was extracted as the poster and baked into frame zero; the decoded frame zero was visually inspected. Final MP4 is H.264, 1920×1080, 30fps, exactly 750 video frames and 25.000 seconds, with stereo AAC 48kHz audio. FFmpeg measured a nonzero -17.7 dB mean audio level and -1.8 dB maximum. Local Whisper transcription of the final MP4 confirms the narration including the consent/private coordination sentence, community check-ins/shelter/transport/resources line, product name, and closing line. Final proof is in delivery-verification.json, final-media-probe.json, final-audio.log, final-video-transcript.json and final-voice-verification.txt. This is decoded-media and transcript verification; no separate native-player listening claim is made.

## Preview and delivery
Editable local preview was started on 127.0.0.1:3939 and verified HTTP 200. It remains available at http://127.0.0.1:3939/#project/composition. No remote publication was performed by this video worker. Optional future edits can use the HyperFrames desktop app.
