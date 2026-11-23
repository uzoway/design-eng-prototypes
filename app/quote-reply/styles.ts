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
    /* An original doodle tile in WhatsApp's style; app/quote-reply/doodles.mjs draws it. */
    --qr-wallpaper: url("/quote-reply/doodles.svg");
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
    /* The chevron's ink sits 9.3-20.3pt from the edge, as in WhatsApp. */
    margin-left: -7px;
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
    width: 36px;
    height: 36px;
    margin-left: 23px;
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
    padding-left: 12px;
  }

  [data-qr-who] strong {
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    line-height: 20px;
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
    gap: 20.4px;
    padding: 0 20.3px 0 12px;
    color: var(--qr-icon);
  }

  /* Each icon's box is its ink, so the sizes and gap are WhatsApp's measured ones. */
  [data-qr-calls] svg:first-child {
    width: 26.4px;
    height: 17.8px;
  }

  [data-qr-calls] svg:last-child {
    width: 20.3px;
    height: 20.3px;
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
    background-size: 380px 380px;
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
    font-size: 9px;
    line-height: 11px;
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
    padding: 12px 8px 13px 15px;
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
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--qr-ada-text);
    font-size: 12px;
    font-weight: 600;
    line-height: 16px;
  }

  [data-qr-quote-text] {
    display: -webkit-box;
    margin-top: 4px;
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
    inset: 0 40px 0 0;
    padding: 10px 0 0 12px;
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
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
    right: 0;
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
    width: 25px;
    height: 25px;
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

  /* 27.7px puts the plus's ink at WhatsApp's 19.3pt. */
  [data-qr-round] svg {
    width: 27.7px;
    height: 27.7px;
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
    /* The icon's ink ends 12pt inside the field's edge, as in WhatsApp. */
    margin-right: 5.9px;
    display: grid;
    place-items: center;
    color: var(--qr-icon);
  }

  [data-qr-sticker] svg {
    width: 18px;
    height: 17.5px;
  }

  [data-qr-camera] {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    box-sizing: border-box;
    /* 54px wide with this inset leaves 18.7pt from the field and 12.3pt to the mic. */
    padding-left: 6.4px;
    overflow: clip;
    color: var(--qr-icon);
  }

  [data-qr-camera] svg {
    flex: 0 0 auto;
    width: 23px;
    height: 18px;
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
    width: 11.7px;
    height: 17.7px;
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

  /* A message too tall for the lifted view scrolls inside its bubble. */
  [data-qr-lift-scroll] {
    margin: -6px -12px -7px;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: inherit;
    scrollbar-width: none;
  }

  [data-qr-lift-scroll]::-webkit-scrollbar {
    display: none;
  }

  [data-qr-lift-scroll-inner] {
    position: relative;
    padding: 6px 12px 7px;
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
    width: min(336px, calc(100% - 32px));
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
    flex: 1 1 0;
    min-width: 0;
    max-width: 42.8px;
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
