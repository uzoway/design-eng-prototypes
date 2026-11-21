// A faint doodle wallpaper, drawn for app/voice-note and copied here.
const DOODLES = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none" stroke="#b9ab94" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.42">
  <path d="M38 46c-7-5-11-9-11-13.5a5.5 5.5 0 0 1 11-1.7 5.5 5.5 0 0 1 11 1.7C49 37 45 41 38 46z"/>
  <path d="M118 20l3.2 6.6 7.2 1-5.2 5 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.2-5 7.2-1z"/>
  <path d="M196 24h30a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6h-18l-8 7v-7h-4a6 6 0 0 1-6-6V30a6 6 0 0 1 6-6z"/>
  <path d="M206 37h14"/>
  <path d="M268 84v22a5 5 0 1 1-3-4.6V88l12-3v17a5 5 0 1 1-3-4.6"/>
  <path d="M54 104h22v14a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z"/>
  <path d="M76 109h3a4 4 0 0 1 0 8h-3"/>
  <path d="M60 97c0-3 3-3 3-6M68 97c0-3 3-3 3-6"/>
  <path d="M162 88a14 14 0 1 0 12 22 11 11 0 1 1-12-22z"/>
  <path d="M212 168l40-16-14 38-8-14z"/>
  <path d="M230 176l8-14"/>
  <path d="M26 196a10 10 0 0 1 19-4 8 8 0 0 1 13 8h-32a6 6 0 0 1 0-4z"/>
  <circle cx="128" cy="178" r="15"/>
  <path d="M122 175h.1M134 175h.1M121 184c4 4 10 4 14 0"/>
  <path d="M176 252c0-16 12-26 28-26 0 16-12 26-28 26z"/>
  <path d="M176 252l18-16"/>
  <path d="M56 252h30a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H56a4 4 0 0 1-4-4v-18a4 4 0 0 1 4-4z"/>
  <path d="M64 252l4-6h14l4 6"/>
  <circle cx="71" cy="265" r="6"/>
  <path d="M264 230l-10 18h10l-8 18"/>
  <path d="M96 60v8M92 64h8"/>
  <path d="M182 134v8M178 138h8"/>
  <path d="M22 132v8M18 136h8"/>
  <path d="M278 12v8M274 16h8"/>
  <path d="M120 226a12 12 0 0 1 12 12c0 9-12 16-12 16s-12-7-12-16a12 12 0 0 1 12-12z"/>
  <path d="M120 254v12"/>
  <circle cx="250" cy="134" r="7"/>
  <path d="M250 120v3M250 145v3M236 134h3M261 134h3"/>
</svg>`;

const WALLPAPER = `url("data:image/svg+xml,${encodeURIComponent(DOODLES.trim())}")`;

/*
 * Sizes are WhatsApp's at the text size on Uzo's phone, measured from the
 * screenshots in briefs/refs/whatsapp-quote-reply (pt = CSS px). Colours are
 * the light tokens from app/voice-note, matched to WhatsApp's light theme.
 */
export const STYLES = `
  [data-qr-stage] {
    --qr-ease: cubic-bezier(0.32, 0.72, 0, 1);
    --qr-top: 8px;
    --qr-bottom: 8px;
    --qr-wallpaper: ${WALLPAPER};
    --qr-wall: #f5f1eb;
    --qr-text: #0b0b0b;
    --qr-dim: #667075;
    --qr-meta: #8a8f93;
    --qr-meta-out: #6f8a6c;
    --qr-icon: #0b0b0b;
    --qr-in: #ffffff;
    --qr-out: #d9fdd3;
    --qr-bubble-shadow: drop-shadow(0 1px 0.5px rgba(0, 0, 0, 0.1));
    --qr-green: #1daa61;
    --qr-focus: #1d8a5c;
    --qr-ticks: #2b8cf2;
    --qr-tint: rgba(0, 0, 0, 0.055);
    --qr-tint-strong: rgba(0, 0, 0, 0.09);
    --qr-bar: rgba(246, 246, 246, 0.94);
    --qr-bar-solid: #f6f6f6;
    --qr-hairline: rgba(60, 60, 67, 0.2);
    --qr-field: #ffffff;
    --qr-field-edge: rgba(60, 60, 67, 0.16);
    --qr-chip: rgba(255, 255, 255, 0.95);
    --qr-chip-text: #3b3b3b;
    --qr-avatar: #ced5da;
    --qr-avatar-glyph: #ffffff;
    --qr-ada: #7a5af8;
    --qr-ada-text: #6847e6;
    --qr-quote-in: rgba(11, 20, 26, 0.045);
    --qr-quote-out: rgba(20, 70, 30, 0.07);
    --qr-quote-in-hover: rgba(11, 20, 26, 0.075);
    --qr-quote-out-hover: rgba(20, 70, 30, 0.11);
    --qr-select: rgba(29, 170, 97, 0.24);
    --qr-handle: #1daa61;
    --qr-jump: rgba(29, 170, 97, 0.2);
    --qr-flash: rgba(17, 27, 33, 0.08);
    --qr-scrim: rgba(18, 18, 18, 0.16);
    --qr-card: rgba(255, 255, 255, 0.86);
    --qr-card-solid: #ffffff;
    --qr-card-press: rgba(0, 0, 0, 0.06);
    --qr-card-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.06),
      0 10px 40px -8px rgba(0, 0, 0, 0.22), 0 2px 8px -2px rgba(0, 0, 0, 0.08);
    --qr-separator: rgba(60, 60, 67, 0.18);
    --qr-gap: rgba(116, 116, 128, 0.12);
    --qr-red: #ea0038;
    --qr-stage-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12),
      0 40px 80px -32px rgba(0, 0, 0, 0.32),
      0 16px 32px -20px rgba(0, 0, 0, 0.22);
    color-scheme: light;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  [data-qr-device] {
    position: relative;
    width: 390px;
    height: clamp(640px, calc(100svh - 112px), 800px);
    border-radius: 28px;
    background: var(--qr-wall);
    box-shadow: var(--qr-stage-shadow);
  }

  [data-qr-screen] {
    position: absolute;
    inset: 0;
    overflow: clip;
    border-radius: inherit;
    color: var(--qr-text);
    background: var(--qr-wall);
    isolation: isolate;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui,
      sans-serif;
    letter-spacing: 0;
    -webkit-font-smoothing: antialiased;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  :where([data-qr-screen]) button {
    margin: 0;
    padding: 0;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
    letter-spacing: inherit;
    text-align: inherit;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  [data-qr-screen] p {
    margin: 0;
  }

  [data-qr-screen] svg {
    display: block;
  }

  [data-qr-screen] :focus {
    outline: none;
  }

  [data-qr-screen] :focus-visible {
    outline: 2px solid var(--qr-focus);
    outline-offset: 2px;
  }

  /* Header ----------------------------------------------------------------- */

  [data-qr-header] {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 3;
    height: calc(var(--qr-top) + 44px);
    padding-top: var(--qr-top);
    display: flex;
    align-items: center;
    background: var(--qr-bar);
    box-shadow: 0 0.5px 0 var(--qr-hairline);
    backdrop-filter: blur(20px) saturate(1.8);
    -webkit-backdrop-filter: blur(20px) saturate(1.8);
  }

  [data-qr-back] {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin-left: -2px;
    border-radius: 22px;
    color: var(--qr-icon);
  }

  [data-qr-back] svg {
    width: 12px;
    height: 20px;
  }

  [data-qr-avatar] {
    display: grid;
    place-items: end center;
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    margin-left: 15px;
    overflow: hidden;
    border-radius: 50%;
    color: var(--qr-avatar-glyph);
    background: var(--qr-avatar);
  }

  [data-qr-avatar] svg {
    width: 100%;
    height: 100%;
  }

  [data-qr-who] {
    display: grid;
    flex: 1 1 auto;
    min-width: 0;
    padding-left: 10px;
  }

  [data-qr-who] strong {
    overflow: hidden;
    font-size: 17px;
    font-weight: 600;
    line-height: 21px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  [data-qr-who] span {
    color: var(--qr-meta);
    font-size: 12px;
    line-height: 15px;
  }

  [data-qr-calls] {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    gap: 17px;
    padding: 0 20px 0 12px;
    color: var(--qr-icon);
  }

  [data-qr-calls] svg {
    width: 27px;
    height: 27px;
  }

  /* Chat ------------------------------------------------------------------- */

  [data-qr-scroll] {
    position: absolute;
    inset: 0;
    overflow-x: clip;
    overflow-y: auto;
    overscroll-behavior: contain;
    background-color: var(--qr-wall);
    background-image: var(--qr-wallpaper);
    background-size: 300px 300px;
    background-attachment: local;
    scrollbar-width: none;
    touch-action: pan-y;
  }

  [data-qr-scroll]::-webkit-scrollbar {
    display: none;
  }

  [data-qr-thread] {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding-top: calc(var(--qr-top) + 44px + 10px);
  }

  [data-qr-date] {
    align-self: center;
    min-width: 99px;
    margin: 0 0 10px !important;
    padding: 0 14px;
    border-radius: 10px;
    color: var(--qr-chip-text);
    background: var(--qr-chip);
    box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.06);
    font-size: 12px;
    font-weight: 600;
    line-height: 20px;
    text-align: center;
  }

  [data-qr-row] {
    display: flex;
    padding: 0 16px 0 16px;
  }

  [data-qr-row] + [data-qr-row] {
    margin-top: 4px;
  }

  [data-qr-row][data-group-start] + [data-qr-row],
  [data-qr-row] + [data-qr-row][data-group-start] {
    margin-top: 14px;
  }

  [data-qr-row][data-side="out"] {
    justify-content: flex-end;
  }

  [data-qr-bubble] {
    position: relative;
    isolation: isolate;
    max-width: min(286px, calc((100% - 0px) * 0.8));
    padding: 6px 12px 7px;
    border-radius: 18px;
    transition: scale 260ms var(--qr-ease);
    touch-action: pan-y;
  }

  [data-qr-bubble][data-quoted] {
    padding-top: 4px;
  }

  [data-qr-bubble][data-pressed] {
    scale: 0.98;
    transition-duration: 400ms;
  }

  [data-qr-bubble][data-hidden] {
    visibility: hidden;
  }

  [data-qr-surface] {
    position: absolute;
    inset: 0;
    z-index: -2;
    border-radius: inherit;
    background: var(--qr-in);
    filter: var(--qr-bubble-shadow);
    pointer-events: none;
  }

  [data-side="out"] [data-qr-surface] {
    background: var(--qr-out);
  }

  [data-qr-tail] {
    position: absolute;
    bottom: 0;
    width: 12px;
    height: 17px;
  }

  [data-qr-tail] path {
    fill: var(--qr-in);
  }

  [data-side="in"] [data-qr-tail] {
    left: -6px;
  }

  [data-side="out"] [data-qr-tail] {
    right: -6px;
    transform: scaleX(-1);
  }

  [data-side="out"] [data-qr-tail] path {
    fill: var(--qr-out);
  }

  [data-qr-flash] {
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--qr-flash);
    pointer-events: none;
  }

  [data-qr-text] {
    position: relative;
    font-size: 14px;
    line-height: 19px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* Emoji come from another font with taller metrics; pin them to the line so
     a 🙏 never makes its line taller than the rest. */
  [data-qr-emoji] {
    line-height: 0;
  }

  [data-qr-meta-space] {
    display: inline-block;
    width: 34px;
    height: 1px;
  }

  [data-side="out"] [data-qr-meta-space] {
    width: 52px;
  }

  [data-qr-meta] {
    position: absolute;
    right: 12px;
    bottom: 5px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--qr-meta);
    font-size: 10px;
    line-height: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  [data-side="out"] [data-qr-meta] {
    color: var(--qr-meta-out);
  }

  [data-qr-ticks] {
    position: relative;
    display: grid;
    width: 16px;
    height: 10px;
  }

  [data-qr-ticks] > span {
    grid-area: 1 / 1;
    display: grid;
  }

  [data-qr-ticks] svg {
    width: 16px;
    height: 10px;
  }

  [data-qr-ticks][data-state="read"] {
    color: var(--qr-ticks);
  }

  /* Highlight layers sit behind the words, inside the text box. */
  [data-qr-band] {
    position: absolute;
    left: 0;
    top: 0;
    z-index: -1;
    height: 19px;
    background: var(--qr-select);
    pointer-events: none;
  }

  [data-qr-band][data-kind="jump"] {
    background: var(--qr-jump);
  }

  /* Quote block, in a sent bubble ----------------------------------------- */

  [data-qr-quote] {
    position: relative;
    display: block;
    width: calc(100% + 16px);
    min-width: 0;
    margin: 0 -8px 4px;
    padding: 10px 12px 10px 16px;
    overflow: hidden;
    border-radius: 13px;
    background: var(--qr-quote-in);
    transition: background-color 160ms ease, scale 240ms var(--qr-ease);
  }

  [data-side="out"] [data-qr-quote] {
    background: var(--qr-quote-out);
  }

  [data-qr-quote]::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--qr-ada);
  }

  [data-qr-quote]:active {
    scale: 0.98;
    transition-duration: 90ms;
  }

  [data-qr-quote-name] {
    display: block;
    color: var(--qr-ada-text);
    font-size: 12px;
    font-weight: 600;
    line-height: 16px;
  }

  [data-qr-quote-text] {
    display: -webkit-box;
    margin-top: 2px;
    overflow: hidden;
    color: var(--qr-dim);
    font-size: 12px;
    line-height: 16px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow-wrap: anywhere;
  }

  /* Swipe to reply ---------------------------------------------------------- */

  [data-qr-swipe-icon] {
    position: absolute;
    left: 10px;
    top: 50%;
    width: 30px;
    height: 30px;
    margin-top: -15px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--qr-icon);
    background: var(--qr-chip);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    pointer-events: none;
  }

  [data-qr-swipe-icon] svg {
    width: 17px;
    height: 17px;
  }

  /* Chat bar ---------------------------------------------------------------- */

  [data-qr-bar] {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    background: var(--qr-bar);
    box-shadow: 0 -0.5px 0 var(--qr-hairline);
    backdrop-filter: blur(20px) saturate(1.8);
    -webkit-backdrop-filter: blur(20px) saturate(1.8);
  }

  [data-qr-panel-clip] {
    position: relative;
    overflow: clip;
  }

  [data-qr-panel] {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 52px;
  }

  [data-qr-panel-quote] {
    position: absolute;
    inset: 0 50px 0 0;
    padding: 9px 0 0 13px;
  }

  [data-qr-panel-quote]::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--qr-ada);
  }

  [data-qr-panel-name] {
    display: block;
    color: var(--qr-ada-text);
    font-size: 12px;
    font-weight: 600;
    line-height: 16px;
  }

  [data-qr-panel-text] {
    display: block;
    margin-top: 2px;
    overflow: hidden;
    color: var(--qr-dim);
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  [data-qr-panel-close] {
    position: absolute;
    right: 8px;
    top: 50%;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-top: -20px;
    border-radius: 20px;
    color: #3a3a3c;
    transition: background-color 160ms ease, scale 240ms var(--qr-ease);
  }

  [data-qr-panel-close] svg {
    width: 23px;
    height: 23px;
  }

  [data-qr-row-bar] {
    position: relative;
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 9px 0 0;
  }

  [data-qr-inset] {
    height: var(--qr-bottom);
  }

  [data-qr-round] {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 47px;
    height: 44px;
    color: var(--qr-icon);
    border-radius: 22px;
    transition: background-color 160ms ease, scale 240ms var(--qr-ease);
  }

  [data-qr-round] svg {
    width: 24px;
    height: 24px;
  }

  [data-qr-field] {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    height: 27px;
    border-radius: 14px;
    background: var(--qr-field);
    box-shadow: inset 0 0 0 1px var(--qr-field-edge);
    cursor: text;
  }

  [data-qr-input] {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    margin: 0;
    padding: 0 6px 0 10px;
    border: 0;
    color: var(--qr-text);
    background: transparent;
    font: inherit;
    font-size: 14px;
    line-height: 19px;
    caret-color: var(--qr-green);
    user-select: text;
    -webkit-user-select: text;
    outline: none;
  }

  [data-qr-input]::placeholder {
    color: transparent;
  }

  /* A text field matches :focus-visible on a tap too, so its ring only shows
     when focus came from the keyboard. The caret is enough otherwise. */
  [data-qr-input]:focus-visible {
    outline: none;
  }

  [data-qr-screen][data-modality="keyboard"] [data-qr-field]:focus-within {
    box-shadow: inset 0 0 0 1px var(--qr-field-edge), 0 0 0 2px var(--qr-focus);
  }

  [data-qr-sticker] {
    flex: 0 0 auto;
    width: 30px;
    height: 27px;
    display: grid;
    place-items: center;
    color: var(--qr-icon);
  }

  [data-qr-sticker] svg {
    width: 20px;
    height: 20px;
  }

  [data-qr-camera] {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    overflow: clip;
    color: var(--qr-icon);
  }

  [data-qr-camera] svg {
    width: 25px;
    height: 25px;
  }

  [data-qr-send-slot] {
    position: relative;
    flex: 0 0 auto;
    width: 32px;
    height: 32px;
  }

  [data-qr-mic],
  [data-qr-send] {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #ffffff;
    background: var(--qr-green);
  }

  [data-qr-mic] svg {
    width: 19px;
    height: 19px;
  }

  [data-qr-send] svg {
    width: 18px;
    height: 18px;
    margin-left: 2px;
  }

  [data-qr-keyboard-layer] {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 4;
    height: 336px;
  }

  /* Long-press: lifted message ---------------------------------------------- */

  [data-qr-overlay] {
    position: absolute;
    inset: 0;
    z-index: 10;
  }

  [data-qr-backdrop] {
    position: absolute;
    inset: 0;
    background: var(--qr-scrim);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
  }

  [data-qr-lifted] {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    transform-origin: 50% 50%;
  }

  [data-qr-lifted] [data-qr-bubble] {
    max-width: none;
    touch-action: none;
  }

  [data-qr-lifted] [data-qr-text] {
    cursor: text;
    touch-action: none;
  }

  [data-qr-lifted] [data-qr-text]:focus-visible {
    outline: none;
  }

  [data-qr-caret] {
    position: absolute;
    left: 0;
    top: 0;
    width: 2px;
    height: 19px;
    border-radius: 1px;
    background: var(--qr-handle);
    pointer-events: none;
  }

  [data-qr-handle] {
    position: absolute;
    left: 0;
    top: 0;
    width: 44px;
    height: 44px;
    margin: -22px 0 0 -22px;
    touch-action: none;
    cursor: grab;
  }

  [data-qr-handle]:active {
    cursor: grabbing;
  }

  [data-qr-handle] i {
    position: absolute;
    left: 21px;
    width: 2px;
    height: 19px;
    background: var(--qr-handle);
  }

  [data-qr-handle] b {
    position: absolute;
    left: 14.5px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: var(--qr-handle);
  }

  [data-qr-handle][data-end="start"] i {
    top: 22px;
  }

  [data-qr-handle][data-end="start"] b {
    top: 7.5px;
  }

  /* y is the line top for both; the end handle's box sits a line lower so its
     touch area covers the caret and the ball under it. */
  [data-qr-handle][data-end="end"] {
    margin-top: -3px;
  }

  [data-qr-handle][data-end="end"] i {
    top: 3px;
  }

  [data-qr-handle][data-end="end"] b {
    top: 21.5px;
  }

  [data-qr-reactions] {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    align-items: center;
    width: 336px;
    height: 56px;
    padding: 0 10px 0 4px;
    border-radius: 28px;
    background: var(--qr-card);
    box-shadow: var(--qr-card-shadow);
    backdrop-filter: blur(30px) saturate(1.8);
    -webkit-backdrop-filter: blur(30px) saturate(1.8);
    transform-origin: 30px 100%;
  }

  [data-qr-emoji-button] {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 42.8px;
    height: 46px;
    border-radius: 23px;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji",
      sans-serif;
    font-size: 27px;
    line-height: 1;
    transition: background-color 160ms ease, scale 240ms var(--qr-ease);
  }

  [data-qr-react-more] {
    position: absolute;
    right: 10px;
    top: 10.5px;
    display: grid;
    place-items: center;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    color: #8e8e93;
    background: #ececec;
    box-shadow: -4px 0 8px -2px rgba(255, 255, 255, 0.9);
    transition: background-color 160ms ease, scale 240ms var(--qr-ease);
  }

  [data-qr-react-more] svg {
    width: 22px;
    height: 22px;
  }

  [data-qr-menu] {
    position: absolute;
    left: 0;
    top: 0;
    width: 250px;
    overflow: clip;
    border-radius: 13px;
    background: var(--qr-card);
    box-shadow: var(--qr-card-shadow);
    backdrop-filter: blur(30px) saturate(1.8);
    -webkit-backdrop-filter: blur(30px) saturate(1.8);
    transform-origin: 20px 0;
  }

  [data-qr-menu-item] {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 41.33px;
    padding: 0 18px 0 17px;
    font-size: 14px;
    line-height: 19px;
    transition: background-color 120ms ease;
  }

  [data-qr-menu-item] + [data-qr-menu-item]::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 0.5px;
    background: var(--qr-separator);
  }

  [data-qr-menu-item][data-danger] {
    color: var(--qr-red);
  }

  [data-qr-menu-item] svg {
    width: 21px;
    height: 21px;
  }

  [data-qr-menu-gap] {
    height: 7px;
    background: var(--qr-gap);
  }

  [data-qr-menu-gap] + [data-qr-menu-item]::before {
    display: none;
  }

  [data-qr-menu-item]:active,
  [data-qr-menu-item][data-active] {
    background: var(--qr-card-press);
  }

  /* iOS edit menu ------------------------------------------------------------ */

  [data-qr-pill] {
    position: absolute;
    left: 0;
    top: 0;
    filter: drop-shadow(0 0 0.5px rgba(0, 0, 0, 0.18))
      drop-shadow(0 6px 14px rgba(0, 0, 0, 0.16));
  }

  [data-qr-pill-body] {
    display: flex;
    height: 36px;
    overflow: clip;
    border-radius: 9px;
    background: var(--qr-card-solid);
  }

  [data-qr-pill-item] {
    position: relative;
    display: grid;
    place-items: center;
    height: 36px;
    padding: 0 14.5px;
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
    transition: background-color 120ms ease;
  }

  [data-qr-pill-item] + [data-qr-pill-item]::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0.5px;
    background: var(--qr-separator);
  }

  [data-qr-pill-item]:active,
  [data-qr-pill-item][data-active] {
    background: var(--qr-card-press);
  }

  [data-qr-pill-arrow] {
    position: absolute;
    width: 14px;
    height: 6px;
    margin-left: -7px;
    fill: var(--qr-card-solid);
  }

  [data-qr-pill-arrow][data-below] {
    rotate: 180deg;
  }

  /* The snippet on its way to the composer. */
  [data-qr-ghost] {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 20;
    transform-origin: 0 0;
    pointer-events: none;
    font-size: 14px;
    line-height: 19px;
    white-space: pre;
  }

  [data-qr-ghost] span {
    position: absolute;
    left: 0;
    top: 0;
  }

  /* Prototype affordances, outside the device ------------------------------- */

  [data-qr-note] {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    color: rgba(11, 11, 11, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui,
      sans-serif;
    font-size: 12px;
    line-height: 16px;
  }

  [data-qr-reset] {
    padding: 4px 8px;
    margin: -4px -8px;
    border: 0;
    border-radius: 6px;
    color: rgba(11, 11, 11, 0.72);
    background: transparent;
    font: inherit;
    text-decoration: underline;
    text-decoration-color: rgba(11, 11, 11, 0.25);
    text-underline-offset: 3px;
    cursor: pointer;
    transition: color 160ms ease, background-color 160ms ease;
  }

  [data-qr-reset]:active {
    scale: 0.94;
  }

  [data-qr-reset]:focus-visible {
    outline: 2px solid var(--qr-focus);
    outline-offset: 2px;
  }

  /* Press + hover ----------------------------------------------------------
     Press is a small, quick settle. Hover never scales. */

  [data-qr-press] {
    transition: scale 240ms var(--qr-ease), background-color 160ms ease,
      color 160ms ease, opacity 160ms ease;
  }

  [data-qr-press]:active {
    scale: 0.94;
    transition-duration: 90ms;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-qr-back]:hover,
    [data-qr-round]:hover,
    [data-qr-panel-close]:hover {
      background-color: var(--qr-tint);
    }

    [data-qr-quote]:hover {
      background-color: var(--qr-quote-in-hover);
    }

    [data-side="out"] [data-qr-quote]:hover {
      background-color: var(--qr-quote-out-hover);
    }

    [data-qr-emoji-button]:hover {
      background-color: var(--qr-tint);
    }

    [data-qr-react-more]:hover {
      background-color: #e2e2e4;
    }

    [data-qr-menu-item]:hover,
    [data-qr-pill-item]:hover {
      background-color: var(--qr-card-press);
    }

    [data-qr-mic]:hover,
    [data-qr-send]:hover {
      background-color: #18975a;
    }

    [data-qr-reset]:hover {
      color: rgba(11, 11, 11, 0.92);
      background-color: rgba(11, 11, 11, 0.05);
    }

    [data-qr-handle]:hover b {
      box-shadow: 0 0 0 4px rgba(29, 170, 97, 0.18);
    }
  }

  /* Phone recording mode (?device) and real phones ------------------------- */

  @media (max-width: 520px) {
    [data-qr-stage] {
      --qr-top: env(safe-area-inset-top, 0px);
      --qr-bottom: max(env(safe-area-inset-bottom, 0px), 8px);
    }

    [data-qr-device] {
      width: 100vw;
      height: 100dvh;
      border-radius: 0;
      box-shadow: none;
    }

    [data-qr-note] {
      display: none;
    }
  }

  html[data-qr-device-mode] [data-qr-stage] {
    --qr-top: 59px;
    --qr-bottom: 34px;
  }

  html[data-qr-device-mode] [data-qr-device] {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    box-shadow: none;
  }

  html[data-qr-device-mode] [data-qr-note] {
    display: none;
  }

  [data-qr-status] {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    z-index: 30;
    height: 59px;
    pointer-events: none;
    color: #000000;
  }

  [data-qr-clock] {
    position: absolute;
    top: 17px;
    width: 134px;
    font-size: 17px;
    font-weight: 600;
    line-height: 22px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  [data-qr-glyphs] {
    position: absolute;
    top: 22px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  [data-qr-glyphs] svg:nth-child(1) {
    width: 18px;
    height: 12px;
  }

  [data-qr-glyphs] svg:nth-child(2) {
    width: 16px;
    height: 12px;
  }

  [data-qr-glyphs] svg:nth-child(3) {
    width: 27px;
    height: 13px;
  }

  [data-qr-home] {
    position: absolute;
    left: 50%;
    bottom: 8px;
    z-index: 30;
    width: 134px;
    height: 5px;
    margin-left: -67px;
    border-radius: 3px;
    background: #000000;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    [data-qr-screen] *,
    [data-qr-reset] {
      transition-duration: 0.01ms !important;
    }
  }
`;
