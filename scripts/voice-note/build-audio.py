"""
Builds the WhatsApp voice note for app/voice-note.

  1. Synthesises Ada's note chunk by chunk with macOS `say`.
  2. Joins the chunks with varied gaps (long ones where paragraphs break),
     adds faint room tone and a phone-mic EQ, loudness-normalises to -16 LUFS.
  3. Runs Whisper on every chunk for word timestamps, offsets them into the
     final timeline and maps them onto the display tokens.
  4. Also voices a short Pidgin note (no transcript support) for yesterday.
  5. Writes public/whatsapp/voice-note*.mp3 and app/voice-note/voice-note-words.json.

Usage (needs ffmpeg and faster-whisper):
  VOICE="Zoe (Premium)" python3 scripts/voice-note/build-audio.py

List installed voices with `say -v '?'`. Premium voices sound far less read
than the compact defaults: System Settings → Accessibility → Spoken Content →
System Voice → Manage Voices.
"""

import difflib
import json
import os
import re
import struct
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_AUDIO = os.path.join(ROOT, "public", "whatsapp", "voice-note.mp3")
OUT_JSON = os.path.join(ROOT, "app", "voice-note", "voice-note-words.json")

VOICE = os.environ.get("VOICE", "Samantha")
RATE = int(os.environ.get("RATE", "166"))
SAMPLE_RATE = 44100
PEAK_COUNT = 40

# Each chunk: display tokens (exactly as the transcript shows them), what the
# voice should say, a rate offset, and the silence that follows it. Gaps over
# ~1s become paragraph breaks in the transcript.
P = 1.2  # paragraph break

CHUNKS = [
    ("Okay. So.", "Okay. So.", -12, 0.4),
    ("First of all, it's 114.", "First of all, it's a hundred and fourteen.", 0, 0.32),
    ("Not 115.", "Not a hundred and fifteen.", -8, 0.2),
    ("So technically, we won one.", "So technically, we won one.", 0, 0.3),
    ("Let's start there.", "Let's start there.", -6, P),
    ("We are top of the league.", "We are top of the league.", 4, 0.28),
    ("Top of the league, and guilty of 114 charges.",
     "Top of the league, and guilty of a hundred and fourteen charges.", 0, 0.45),
    ("That is the most City sentence ever written.",
     "That is the most City sentence ever written.", -4, P),
    ("They're saying they might strip the titles.", "They're saying they might strip the titles.", 6, 0.3),
    ("Strip them from who?", "Strip them from who?", -6, 0.32),
    ("I watched them. They're in my head.", "I watched them. They're in my head.", 0, 0.3),
    ("You can't relegate a memory.", "You can't relegate a memory.", -6, 0.6),
    ("Anyway, the lawyers are on it. We've got more lawyers than centre-backs at this point.",
     "Anyway, the lawyers are on it. We've got more lawyers than centre backs at this point.", 8, 0.45),
    ("Maresca says we keep our heads down. Which, to be fair, is also the legal advice.",
     "Maresca says we keep our heads down. Which, to be fair, is also the legal advice.", 4, P),
    ("Sunday. Yes, still at mine.", "Sunday. Yes, still at mine.", -6, 0.32),
    ("Kick-off is half four, so come at four.", "Kick off is half four, so come at four.", -10, 0.36),
    ("Bring the suya. The proper one, not the petrol station one.",
     "Bring the soo-yah. The proper one, not the petrol station one.", 0, P),
    ("And if Haaland scores at Anfield, celebrate quietly.",
     "And if Hahland scores at Anfield, celebrate quietly.", 4, 0.3),
    ("My neighbour is a Liverpool fan, and he has been unbearable all week.",
     "My neighbour is a Liverpool fan, and he has been unbearable all week.", 6, 0.45),
    ("Okay, bye.", "Okay, bye.", -4, 0),
]

# The transcription model mangles footballers' names, as they do. These are
# shown as heard, with low confidence, so you can tap and check them.
MISHEARD = {"Maresca": "Mascara", "suya.": "soya.", "Haaland": "Holland"}

# Yesterday's short note, in Pidgin: transcripts don't support it.
SHORT_TEXT = "Guy, you don see wetin dem talk? Hundred and fourteen. E don cast."
OUT_SHORT = os.path.join(ROOT, "public", "whatsapp", "voice-note-short.mp3")
LEAD_IN = 0.18
TAIL = 0.35


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs)


def duration_of(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", path]).stdout
    return float(out)


def synthesise(index, voice_text, rate_offset, workdir):
    aiff = os.path.join(workdir, f"chunk-{index:02d}.aiff")
    wav = os.path.join(workdir, f"chunk-{index:02d}.wav")
    run(["say", "-v", VOICE, "-r", str(RATE + rate_offset), "-o", aiff, voice_text])
    # Trim the synthesiser's own leading and trailing silence so the gaps
    # between chunks are exactly the ones chosen above.
    trim = ("silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,"
            "areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.04,"
            "areverse")
    run(["ffmpeg", "-y", "-i", aiff, "-af", trim, "-ac", "1", "-ar", str(SAMPLE_RATE), wav])
    return wav


def normalise_token(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def align(tokens, heard):
    """Map display tokens onto Whisper's words by character alignment."""
    if len(tokens) == 1:
        return [(heard[0]["start"], heard[-1]["end"])]

    if len(tokens) == len(heard):
        return [(w["start"], w["end"]) for w in heard]

    display = ""
    owner_display = []
    for i, token in enumerate(tokens):
        norm = normalise_token(token)
        display += norm
        owner_display += [i] * len(norm)

    spoken = ""
    owner_spoken = []
    for i, word in enumerate(heard):
        norm = normalise_token(word["word"])
        spoken += norm
        owner_spoken += [i] * len(norm)

    matcher = difflib.SequenceMatcher(None, display, spoken, autojunk=False)
    hits = {}
    for block in matcher.get_matching_blocks():
        for k in range(block.size):
            token_index = owner_display[block.a + k]
            hits.setdefault(token_index, set()).add(owner_spoken[block.b + k])

    spans = []
    for i in range(len(tokens)):
        if i in hits:
            words = sorted(hits[i])
            spans.append([heard[words[0]]["start"], heard[words[-1]]["end"]])
        else:
            spans.append(None)

    # Anything unmatched is interpolated between its neighbours.
    for i, span in enumerate(spans):
        if span is not None:
            continue
        prev_end = spans[i - 1][1] if i > 0 and spans[i - 1] else heard[0]["start"]
        j = i
        while j < len(spans) and spans[j] is None:
            j += 1
        next_start = spans[j][0] if j < len(spans) else heard[-1]["end"]
        count = j - i
        step = (next_start - prev_end) / max(count, 1)
        for k in range(count):
            spans[i + k] = [prev_end + step * k, prev_end + step * (k + 1)]

    return [tuple(s) for s in spans]


def main():
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper is not installed: pip install faster-whisper")

    model = WhisperModel(os.environ.get("WHISPER_MODEL", "small.en"),
                         device="cpu", compute_type="int8")

    with tempfile.TemporaryDirectory() as workdir:
        pieces = []
        words = []
        cursor = LEAD_IN

        silence_lead = os.path.join(workdir, "lead.wav")
        run(["ffmpeg", "-y", "-f", "lavfi", "-i",
             f"anullsrc=r={SAMPLE_RATE}:cl=mono", "-t", str(LEAD_IN), silence_lead])
        pieces.append(silence_lead)

        for index, (display, voice_text, rate_offset, gap) in enumerate(CHUNKS):
            wav = synthesise(index, voice_text, rate_offset, workdir)
            length = duration_of(wav)
            segments, _ = model.transcribe(wav, word_timestamps=True, language="en",
                                           beam_size=5, condition_on_previous_text=False)
            heard = [{"word": w.word.strip(), "start": w.start, "end": w.end}
                     for s in segments for w in (s.words or [])]
            heard_text = " ".join(w["word"] for w in heard)
            print(f"[{cursor:6.2f}s] {display}\n          heard: {heard_text}")

            tokens = display.split()
            if not heard:
                step = length / len(tokens)
                spans = [(step * i, step * (i + 1)) for i in range(len(tokens))]
            else:
                spans = align(tokens, heard)

            for token, (start, end) in zip(tokens, spans):
                start = min(max(start, 0), length)
                end = min(max(end, start + 0.05), length)
                low = token in MISHEARD
                word = {
                    "text": MISHEARD.get(token, token),
                    "start": round(cursor + start, 3),
                    "end": round(cursor + end, 3),
                    "confidence": 0.3 if low else round(0.86 + 0.13 * ((index * 7 + len(token)) % 10) / 10, 2),
                }
                # The model's runner-up for a word it wasn't sure about.
                if low:
                    word["alternative"] = token.rstrip(".,?!")
                words.append(word)

            pieces.append(wav)
            cursor += length

            pause = gap if index < len(CHUNKS) - 1 else TAIL
            if pause > 0:
                silence = os.path.join(workdir, f"gap-{index:02d}.wav")
                run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                     f"anullsrc=r={SAMPLE_RATE}:cl=mono", "-t", f"{pause:.3f}", silence])
                pieces.append(silence)
                cursor += pause

        concat_list = os.path.join(workdir, "list.txt")
        with open(concat_list, "w") as handle:
            handle.writelines(f"file '{p}'\n" for p in pieces)

        dry = os.path.join(workdir, "dry.wav")
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
             "-ac", "1", "-ar", str(SAMPLE_RATE), dry])
        master(dry, OUT_AUDIO)

        short_dry = synthesise(99, SHORT_TEXT, 0, workdir)
        padded = os.path.join(workdir, "short-padded.wav")
        run(["ffmpeg", "-y", "-i", short_dry, "-af",
             f"adelay={int(LEAD_IN * 1000)},apad=pad_dur={TAIL}", padded])
        master(padded, OUT_SHORT)

        data = {
            "src": "/whatsapp/voice-note.mp3",
            "duration": round(duration_of(OUT_AUDIO), 3),
            "voice": VOICE,
            "peaks": peaks_of(OUT_AUDIO),
            "short": {
                "src": "/whatsapp/voice-note-short.mp3",
                "duration": round(duration_of(OUT_SHORT), 3),
                "peaks": peaks_of(OUT_SHORT),
            },
            "words": words,
        }
        with open(OUT_JSON, "w") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")

        print(f"\nwrote {OUT_AUDIO} ({data['duration']}s), {OUT_SHORT} "
              f"({data['short']['duration']}s) and {OUT_JSON} ({len(words)} words)")


def master(dry, out):
    """Phone-mic character: band-limited, gently compressed, and a very quiet
    room underneath so it doesn't sound studio-clean. Normalised to -16 LUFS."""
    os.makedirs(os.path.dirname(out), exist_ok=True)
    total = duration_of(dry)
    graph = (
        "[0:a]highpass=f=110,lowpass=f=7200,"
        "equalizer=f=2800:t=q:w=1.2:g=2.5,"
        "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120[voice];"
        "[1:a]lowpass=f=1800,highpass=f=60,volume=-46dB[room];"
        "[voice][room]amix=inputs=2:duration=first:normalize=0,"
        "loudnorm=I=-16:TP=-1.5:LRA=11,"
        f"aresample={SAMPLE_RATE}[out]"
    )
    run(["ffmpeg", "-y", "-i", dry, "-f", "lavfi", "-t", f"{total:.3f}",
         "-i", f"anoisesrc=r={SAMPLE_RATE}:color=brown:amplitude=0.5",
         "-filter_complex", graph, "-map", "[out]", "-ac", "1",
         "-codec:a", "libmp3lame", "-b:a", "96k", out])


def peaks_of(path):
    """RMS of equal slices. Speech is fairly even at this resolution, so the
    contrast between the quietest and loudest slices is stretched to read as
    a voice waveform; the quietest draw as dots."""
    raw = run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "8000",
               "-f", "s16le", "-"]).stdout
    samples = struct.unpack(f"<{len(raw) // 2}h", raw)
    size = len(samples) // PEAK_COUNT
    rms = []
    for i in range(PEAK_COUNT):
        chunk = samples[i * size:(i + 1) * size]
        rms.append((sum(s * s for s in chunk) / max(len(chunk), 1)) ** 0.5)
    low, high = min(rms), max(rms)
    span = (high - low) or 1
    return [round(0.08 + 0.92 * ((v - low) / span) ** 1.35, 3) for v in rms]


if __name__ == "__main__":
    main()
