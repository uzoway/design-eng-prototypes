import styles from "../plurise.module.css";

// Two sides of one boundary: the study in a glyph.
export function PluriseMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      className={styles.pluriseMark}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="19" height="19" rx="5.5" />
      <path d="M10 4.75v10.5" />
      <circle cx="6" cy="10" r="1.75" data-fill="" />
      <circle cx="14" cy="10" r="1.6" />
    </svg>
  );
}

export function Brand() {
  return (
    <span className={styles.brand}>
      <PluriseMark />
      <span>PLURISE</span>
    </span>
  );
}

export function AgentMark() {
  return (
    <span className={styles.agentMark} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M6 1.5 10.5 6 6 10.5 1.5 6Z" />
      </svg>
    </span>
  );
}

// Visual only. The control it decorates carries aria-keyshortcuts instead.
export function Kbd({ children }: { children: string }) {
  return (
    <kbd className={styles.kbd} aria-hidden="true">
      {children}
    </kbd>
  );
}
