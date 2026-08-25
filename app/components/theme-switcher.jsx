"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

const THEMES = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
  },
];

export default function ThemeSwitcher() {
  const { theme, setTheme, isReady } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <nav
      aria-label="Appearance"
      className={`fixed left-1/2 top-[max(16px,env(safe-area-inset-top))] z-[70] -translate-x-1/2 ${
        isReady ? "visible" : "invisible"
      }`}
    >
      <fieldset>
        <legend className="sr-only">Color theme</legend>

        <LayoutGroup id="merchant-theme-switcher">
          <div className="flex items-center rounded-[var(--mo-radius-lg)] border border-[var(--mo-switcher-border)] bg-[var(--mo-switcher-bg)] p-1 shadow-[var(--mo-shadow-switcher)] backdrop-blur-xl">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const active = theme === value;

              return (
                <label
                  key={value}
                  data-theme-option
                  data-active={active}
                  className="relative flex h-11 min-w-[88px] cursor-pointer touch-manipulation select-none items-center justify-center rounded-[var(--mo-radius-md)] px-3"
                >
                  <input
                    type="radio"
                    name="merchant-theme"
                    value={value}
                    checked={active}
                    onChange={() => setTheme(value)}
                    className="peer sr-only"
                  />

                  {active && (
                    <motion.span
                      layoutId="merchant-theme-selection"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[var(--mo-radius-md)] border border-[var(--mo-switcher-active-border)] bg-[var(--mo-switcher-active-bg)] shadow-[var(--mo-shadow-switcher-active)]"
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : {
                              type: "spring",
                              stiffness: 520,
                              damping: 38,
                              mass: 0.7,
                            }
                      }
                    />
                  )}

                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[var(--mo-radius-md)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--mo-focus)]"
                  />

                  <span
                    className={`relative z-10 flex items-center gap-2 text-[length:var(--mo-font-size-13)] font-medium transition-colors ${
                      active
                        ? "text-[var(--mo-switcher-text-active)]"
                        : "text-[var(--mo-switcher-text)]"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-[14px]"
                      strokeWidth={1.9}
                    />

                    {label}
                  </span>
                </label>
              );
            })}
          </div>
        </LayoutGroup>
      </fieldset>
    </nav>
  );
}
