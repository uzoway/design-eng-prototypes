# Two Streams — product notes

> "I kinda wish Spotify would let me keep two streams active. Just because I want to listen to a podcast doesn't mean I've given up on the album I had in rotation."
> — [@zendadddy](https://x.com/zendadddy/status/2104289959045898543)

## Try it

At `/two-streams`:

1. Play *Sirens* from the mini-player.
2. Tap play on the **New episode** card. The podcast takes over, and Sirens tucks behind it, held at the exact second it stopped.
3. Tap the small artwork handle in the mini-player to bring Sirens back to the front. It resumes on the same second.
4. Open Now Playing. The held stream is docked at the bottom: tap it to swap, swipe it down (or press Delete) to clear it.

Files: `two-streams-phone.tsx` (the prototype), `icons.tsx`, `page.tsx`. Audio and art are in `public/spotify/`.

## Product manager

### What's actually being asked

Not "play two things at once." The ask is: **don't destroy one listening intention because another one took priority.**

There's a useful asymmetry underneath it. Podcast episodes already remember where you stopped. Music doesn't. Start an episode mid-album and Spotify discards the album context, the track, the second you were at, and the mood you'd built over three songs. Getting back means Search or Recents, finding the album, guessing the track, scrubbing. Most people just don't, and the album quietly gets abandoned.

The useful distinction (it ended up in the podcast script) is between *what you're listening to* and *what you're in the middle of*. Spotify models the first. This models both.

### The model

- One **music** session and one **spoken-word** session can exist at the same time.
- Only one is audible. The other is **held**, frozen at the exact second it stopped.
- Starting content of the same kind replaces that kind's session. There is never a third.
- A held session never advances on its own.
- It disappears when you clear it, or when the stream you leave has already finished. Nothing finished should hang around.
- Only the active session owns the device output, lock screen, Connect and car controls.

### Deliberately out of scope

- **Simultaneous audio.** It conflicts with ads, volume, casting, the car, the lock screen, and the simple promise of one Play button.
- **N tabs.** Two kinds of content, at most one each. More is a queue-management feature that nobody asked for.
- **Auto-return** ("go back to the album when this episode ends"). It's a strong follow-up, but a second idea in a first prototype dilutes both.

### Measures

- Return rate to the held session, and time from the switch to the resume.
- Fewer searches for an album or playlist the listener was just playing.
- Albums finished per week among people who switch between content types.
- Dismissal rate of the held session, as a check on clutter.
- Guardrails: accidental swaps (a swap followed by a swap-back within 5 seconds) and confusion about what Play does.

## Product designer

The prototype is the **Spotify mobile app**, because that's where most listening happens.

### Where the feature lives

Nobody starts a podcast from Now Playing. You start it from Home, Search or Library while an album plays in the mini-player. So the feature shows up in three places, in order of how often people see them:

1. **The mini-player becomes a stack.** Start an episode and the album doesn't disappear: it tucks behind the podcast, peeking 10px above it in its own tint. The peek is the cue, not the control, because a 10px sliver is far below the 44pt touch minimum. The control is a **handle inside the front card**: the held stream's artwork sitting where the Connect icon usually is, a full 44px target. Hovering it lifts the card behind, so cause and effect are visible. Tapping it pulls the held card out of the deck: it lifts fully clear, swaps layers in mid-air, and settles in front.
2. **Now Playing docks the held stream** at the bottom, where the mini-player sits everywhere else in the app. Tap it to swap; swipe down or press Delete to clear it.
3. **Content remembers its state.** The recents tile of the audible stream turns green with live equalizer bars, and the held one shows a pause mark. The episode card shows Spotify's own "2 min left" progress treatment, and its play button resumes the held episode rather than restarting it.

Every play affordance runs through one rule: play the current stream if it's paused, resume a held one by swapping, or start something new and hold whatever was playing.

### Motion: one primary move, everything else in support

The first version moved several things at once, and they read as disjointed. The swap now has one primary motion with deliberate timing around it, all on a single curve (`cubic-bezier(0.32, 0.72, 0, 1)`, the iOS sheet curve):

| Time | What happens |
|---|---|
| 0ms | Tap. The outgoing audio fades in 160ms; the outgoing artwork steps back (scale 0.92, fades in 240ms). Old text clears in 100ms. |
| 0–500ms | **The held artwork rises out of the dock and grows into the hero slot.** This is the one move your eye follows. |
| 0–500ms | The backdrop melts between artwork colours; the progress bar glides to the saved second. |
| 80ms | Transport slots change meaning in place: shuffle ↔ speed, prev/next ↔ 15s skips, repeat ↔ sleep. |
| 140ms | New title and context rise in. |
| 180ms | The dock refills with the stream you just left. |

The Now Playing sheet opens in 440ms and closes in 320ms on the same curve. Every interactive element has a hover state for pointer devices and a press state for touch. The Home filter chips work, and every tile, shelf card and the episode card plays its content. Liked Songs and The Odyssey both play Sirens, but Now Playing names the right context ("Playing from playlist" vs "Playing from album").

### Why not the obvious alternatives

- **Two full players.** Equal visual weight for unequal states, and duplicated transport controls blur which one owns volume, Connect and the lock screen.
- **Two artworks flying past each other.** That's what the first version did, and it's the main reason it felt disjointed. Your eye can follow one flight, not two.
- **A tab switch in the Now Playing header.** It's out of thumb reach and reads like navigation rather than something paused you can resume.

## Design engineer

- **One media element per stream.** Each `<audio>` keeps its own `currentTime`, so independent progress costs nothing.
- **Crossfades run in Web Audio** through a `GainNode` per stream, scheduled on the audio clock. They're sample-accurate, they don't stall when the main thread is throttled, and they work on iOS where `media.volume` is read-only.
- **The checkpoint is the last second the listener heard**: the tap time plus the fade, clamped if the pause timer lands late. Swapping back mid-fade cancels the pause and fades back up.
- **The artwork flight is a measured ghost**, not a shared-layout animation. On tap, the dock artwork and the hero slot are measured, and a single image is animated with transforms between them. That keeps the flight one-directional (`layoutId` would also fly the outgoing art down, which is the disjointed version) and immune to re-renders.
- **No re-renders while playing.** Time labels and progress bars are motion values written straight to the DOM; slider ARIA values update imperatively once a second.
- **Two Motion pitfalls the shuffle hit:**
  - Motion returns any value missing from a new `animate` target to its `initial`. The shuffle keyframes left out `opacity`, so both cards faded to 0 mid-shuffle. Opacity is now pinned in every target.
  - Motion doesn't step through `zIndex` keyframes; it jumps straight to the final value. The back card was popping in front on the first frame, which looked like a snap. The layer swap is now timed by hand to the apex of the arc, when the rising card has fully cleared the front one, so the change is invisible.
- **The shuffle arc is continuous.** It decelerates into the apex and accelerates out of it from rest, so velocity never jumps. The first version stopped at the apex and restarted on a fast-start curve, which read as a snap.
- **Hover never scales**, except the main play button. It changes colour or reveals a quiet surface. Press is a quick settle to 0.94, or 0.98 for large surfaces. The earlier hover 1.06 to press 0.9 swing read as a shake.
- **Drag gestures are touch-only.** With a mouse, a click that wobbles a few pixels would nudge the sheet or dock and snap it back.
- **The phone is a real layout, not a scaled screenshot.** On desktop it sits in a slim frame (no fake status bar or device hardware) whose height adapts to the viewport (640–800px), and the artwork sizes itself with container query units. Below 520px wide, the frame drops away and the prototype is simply the app, full-screen, using the safe-area insets.
- Media Session follows the audible stream. Space plays or pauses, and Escape closes Now Playing (handy when recording).
- Reduced motion turns off the flights, shuffle arcs and marquee; the crossfades become instant.

### Production concerns

A real session record carries the content URI and type, position, context URI (album, playlist or show), queue state, shuffle, repeat, speed, device, and an update timestamp for cross-device sync. Failure states to design for: a held episode that expired, a held track no longer available, entitlement changes, offline content that isn't downloaded, a swap during an ad, an active Connect or cast session, and a held queue edited on another device.

## Assets

- Music: *Sirens*, Ludwig Göransson. Same audio and art as Best Part.
- Podcast: **Second Listen is fictional.** The episode was synthesized with macOS voices over a generated chime, and loudness-matched to Sirens (−16 vs −15.3 LUFS). The cover was designed for this prototype.

To use a real podcast, drop these into `public/spotify/` with the same names: a 2–4 minute clip (`second-listen.mp3`, from the show's public RSS feed) and a 640px+ cover (`second-listen.jpg`). Then update the copy in `STREAMS`. Spotify's own APIs can't serve this: there are no downloadable files, and the Web Playback SDK needs every viewer to log in with Premium and allows only one stream per account. If the site goes public, get the podcast host's permission.

## Naming

"Two Streams" is the concept name, not customer-facing copy. The interface shows only content and state: the title, a pause glyph and a timestamp.
