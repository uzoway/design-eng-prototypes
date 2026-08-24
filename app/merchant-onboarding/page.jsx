"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Check,
  CheckCheck,
  ChevronDown,
  CircleCheck,
  Ellipsis,
  PanelTopClose,
  RotateCcw,
  ShieldCheck,
  Store,
} from "lucide-react";

const INITIAL_STEPS = [
  { id: "business", label: "Business details", completed: true },
  { id: "bank", label: "Bank account", completed: true },
  { id: "identity", label: "Identity verification", completed: true },
  { id: "tax", label: "Tax information (W-9)", completed: false },
];

const REVIEWERS = [
  { id: "uzo", name: "Uzo", seed: "Uzo", background: "bg-[#d9f1fb]" },
  { id: "Victor", name: "Victor", seed: "Victor", background: "bg-[#eee0fa]" },
  { id: "devin", name: "Devin", seed: "Devin", background: "bg-[#fbe3df]" },
];

const RISK_TIERS = ["Low", "Standard", "Elevated"];
const REVIEW_STATUSES = ["Not started", "In review", "Approved"];

const DROPDOWN_EASE = [0.2, 0.8, 0.2, 1];

const avatarUrl = (seed) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=transparent`;

function AnimatedText({
  value,
  className = "",
  reducedMotion,
  align = "left",
}) {
  return (
    <span
      className={`relative inline-grid ${className}`}
      style={{ justifyItems: align === "right" ? "end" : "start" }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="col-start-1 row-start-1 whitespace-nowrap tabular-nums"
          initial={
            reducedMotion ? false : { y: 6, opacity: 0, filter: "blur(3px)" }
          }
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={
            reducedMotion
              ? { opacity: 0 }
              : { y: -6, opacity: 0, filter: "blur(3px)" }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.26, ease: [0.32, 0.72, 0, 1] }
          }
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function AnimatedCount({ count, suffix, reducedMotion }) {
  return (
    <span className="inline-flex items-baseline tabular-nums">
      <span className="relative inline-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={count}
            className="col-start-1 row-start-1"
            initial={
              reducedMotion ? false : { y: 7, opacity: 0, filter: "blur(2px)" }
            }
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { y: -7, opacity: 0, filter: "blur(2px)" }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.34, ease: [0.34, 1.45, 0.64, 1] }
            }
          >
            {count}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="whitespace-pre">{suffix}</span>
    </span>
  );
}

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid size-8 shrink-0 place-items-center rounded-[10px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
    >
      <Store className="size-[18px] text-[#60636a]" strokeWidth={1.7} />
    </span>
  );
}

function ProgressTrack({ value, complete, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block h-[6px] overflow-hidden rounded-full bg-[#ebecef] ${className}`}
    >
      <motion.span
        className="absolute inset-0 origin-left rounded-full"
        initial={false}
        animate={{
          scaleX: value / 100,
          backgroundColor: complete ? "#3fb765" : "#57c36a",
        }}
        transition={{
          scaleX: { type: "spring", stiffness: 480, damping: 40, mass: 0.7 },
          backgroundColor: { duration: 0.3 },
        }}
      />
    </span>
  );
}

function Avatar({ member, size = "size-8" }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-white ${member.background} ${size}`}
      aria-hidden="true"
    >
      <img
        src={avatarUrl(member.seed)}
        alt=""
        width={40}
        height={40}
        draggable={false}
        loading="eager"
        decoding="async"
        className="size-full object-cover"
      />
    </span>
  );
}

function CompactMetadata({ kind, icon: Icon, value, reducedMotion }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[14px] text-[#686b72]">
      <motion.span layoutId={`${kind}-icon`} className="shrink-0">
        <Icon aria-hidden="true" className="size-[15px]" strokeWidth={1.8} />
      </motion.span>
      <motion.span
        layoutId={`${kind}-value`}
        className="truncate whitespace-nowrap"
      >
        <AnimatedText value={value} reducedMotion={reducedMotion} />
      </motion.span>
    </span>
  );
}

function pillStyle(kind, value) {
  if (kind === "risk") {
    if (value === "Elevated")
      return "bg-[#f8e4e6] text-[#8c525a] ring-[#f1d2d6]";
    if (value === "Standard")
      return "bg-[#eef0f3] text-[#5b5f67] ring-[#e2e5ea]";
    return "bg-[#e4f2ea] text-[#4c7a5e] ring-[#d2e8dc]";
  }
  if (value === "Approved") return "bg-[#e4f2ea] text-[#4c7a5e] ring-[#d2e8dc]";
  if (value === "In review")
    return "bg-[#faf3d8] text-[#746837] ring-[#eee4ba]";
  return "bg-[#eef0f3] text-[#5b5f67] ring-[#e2e5ea]";
}

function MetadataSelect({
  kind,
  label,
  icon: Icon,
  value,
  options,
  onValueChange,
  reducedMotion,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3">
      <div className="flex items-center gap-2 text-[14px] text-[#676a71]">
        <motion.span layoutId={`${kind}-icon`}>
          <Icon
            aria-hidden="true"
            className="size-[15px] text-[#9a9ca2]"
            strokeWidth={1.8}
          />
        </motion.span>
        <span>{label}</span>
      </div>

      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <motion.button
            layoutId={`${kind}-value`}
            type="button"
            aria-label={`Change ${label.toLowerCase()}. Current value: ${value}`}
            className={`flex h-8 w-fit max-w-full cursor-pointer touch-manipulation items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium outline-none ring-1 ring-inset transition-[color,background-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-[#6f64ef]/55 ${pillStyle(kind, value)}`}
          >
            <motion.span layout className="truncate">
              <AnimatedText value={value} reducedMotion={reducedMotion} />
            </motion.span>
            <motion.span
              aria-hidden="true"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <ChevronDown className="size-3.5" strokeWidth={2} />
            </motion.span>
          </motion.button>
        </DropdownMenu.Trigger>

        <AnimatePresence>
          {open && (
            <DropdownMenu.Portal forceMount>
              <DropdownMenu.Content asChild sideOffset={8} align="start">
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -5 }}
                  transition={{ duration: 0.17, ease: DROPDOWN_EASE }}
                  style={{ transformOrigin: "top left" }}
                  className="z-50 min-w-[176px] overflow-hidden rounded-[14px] border border-black/[0.06] bg-white/95 p-1 shadow-[0_1px_1px_rgba(0,0,0,0.04),0_10px_20px_-6px_rgba(15,23,42,0.14),0_24px_48px_-12px_rgba(15,23,42,0.14)] backdrop-blur-xl ring-1 ring-black/[0.02]"
                >
                  <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-[#a8aab0]">
                    {label}
                  </div>
                  <DropdownMenu.RadioGroup
                    value={value}
                    onValueChange={onValueChange}
                  >
                    {options.map((option) => {
                      const active = option === value;
                      return (
                        <DropdownMenu.RadioItem
                          key={option}
                          value={option}
                          className={`relative flex h-9 cursor-pointer select-none items-center rounded-[10px] px-2.5 pr-9 text-[13px] outline-none transition-colors data-[highlighted]:bg-[#f5f5f6] ${
                            active
                              ? "font-medium text-[#2f3136]"
                              : "text-[#5c5f66]"
                          }`}
                        >
                          {option}
                          <DropdownMenu.ItemIndicator className="absolute right-2.5 text-[#6f64ef]">
                            <Check
                              aria-hidden="true"
                              className="size-4"
                              strokeWidth={2.4}
                            />
                          </DropdownMenu.ItemIndicator>
                        </DropdownMenu.RadioItem>
                      );
                    })}
                  </DropdownMenu.RadioGroup>
                </motion.div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          )}
        </AnimatePresence>
      </DropdownMenu.Root>
    </div>
  );
}

function StepChecklist({ steps, onToggle, reducedMotion }) {
  return (
    <ul className="relative ml-1 space-y-0.5 pl-[26px]">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <motion.li
            layout="position"
            key={step.id}
            className="relative"
            initial={reducedMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    delay: 0.14 + index * 0.04,
                    duration: 0.22,
                    ease: DROPDOWN_EASE,
                  }
            }
          >
            <svg
              aria-hidden="true"
              className="absolute -left-[19px] top-0 h-full w-5 overflow-visible text-[#dedfe2]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {isLast ? (
                <path d="M2 0 V 12 Q 2 18 8 18" strokeLinecap="round" />
              ) : (
                <path d="M2 0 V 40 M2 18 H 8" strokeLinecap="round" />
              )}
            </svg>

            <label className="group/task relative -ml-1 flex min-h-8 cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg px-1.5 outline-none">
              <input
                type="checkbox"
                checked={step.completed}
                onChange={() => onToggle(step.id)}
                className="peer sr-only"
              />
              <motion.span
                aria-hidden="true"
                className="relative grid size-[20px] shrink-0 place-items-center rounded-full border peer-focus-visible:ring-2 peer-focus-visible:ring-[#6f64ef]/50 peer-focus-visible:ring-offset-2"
                animate={{
                  backgroundColor: step.completed ? "#4b4e54" : "#ffffff",
                  borderColor: step.completed ? "#4b4e54" : "#cfd1d5",
                }}
                transition={{ duration: 0.15 }}
              >
                <AnimatePresence initial={false}>
                  {step.completed && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.4, rotate: -15 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{
                        type: "spring",
                        stiffness: 700,
                        damping: 35,
                      }}
                    >
                      <Check className="size-3 text-white" strokeWidth={2.8} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
              <span
                className={`text-[14px] transition-colors ${
                  step.completed ? "text-[#83868c]" : "text-[#5e6168]"
                }`}
              >
                {step.label}
              </span>
            </label>
          </motion.li>
        );
      })}
    </ul>
  );
}

function ActionsMenu({
  open,
  onOpenChange,
  onClosed,
  tooltipOpen,
  onTooltipChange,
  onCollapse,
  onReset,
  onCompleteAll,
}) {
  const skipFocusRef = useRef(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <Tooltip.Root open={tooltipOpen} onOpenChange={onTooltipChange}>
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>
            <motion.button
              type="button"
              aria-label="Account actions"
              whileTap={{ scale: 0.92 }}
              className="grid size-9 shrink-0 cursor-pointer touch-manipulation place-items-center rounded-[10px] border border-black/[0.055] bg-white text-[#5d6066] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-colors hover:bg-[#f7f7f8] focus-visible:ring-2 focus-visible:ring-[#6f64ef]/50"
            >
              <Ellipsis
                aria-hidden="true"
                className="size-[18px]"
                strokeWidth={2}
              />
            </motion.button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={7}
            className="z-[60] rounded-md bg-[#27272a] px-2.5 py-1.5 text-xs text-white shadow-lg"
          >
            Actions
            <Tooltip.Arrow className="fill-[#27272a]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      <AnimatePresence onExitComplete={onClosed}>
        {open && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content
              asChild
              sideOffset={8}
              align="end"
              onCloseAutoFocus={(e) => {
                if (skipFocusRef.current) {
                  e.preventDefault();
                  skipFocusRef.current = false;
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: -3,
                  transition: { duration: 0.1, ease: [0.4, 0, 1, 1] },
                }}
                transition={{ duration: 0.19, ease: DROPDOWN_EASE }}
                style={{ transformOrigin: "top right" }}
                className="z-50 min-w-[204px] overflow-hidden rounded-[14px] border border-black/[0.06] bg-white/95 p-1 shadow-[0_1px_1px_rgba(0,0,0,0.04),0_10px_20px_-6px_rgba(15,23,42,0.14),0_24px_48px_-12px_rgba(15,23,42,0.14)] backdrop-blur-xl ring-1 ring-black/[0.02]"
              >
                <DropdownMenu.Item
                  onSelect={() => {
                    skipFocusRef.current = true;
                    onCollapse();
                  }}
                  className="flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-[#4b4e54] outline-none transition-colors data-[highlighted]:bg-[#f5f5f6]"
                >
                  <PanelTopClose
                    className="size-4 text-[#9a9ca2]"
                    strokeWidth={1.9}
                  />
                  Collapse details
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={onCompleteAll}
                  className="flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-[#4b4e54] outline-none transition-colors data-[highlighted]:bg-[#f5f5f6]"
                >
                  <CheckCheck
                    className="size-4 text-[#9a9ca2]"
                    strokeWidth={1.9}
                  />
                  Mark all verified
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-[#ececed]" />
                <DropdownMenu.Item
                  onSelect={onReset}
                  className="flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-[#c2544f] outline-none transition-colors data-[highlighted]:bg-[#fbeceb]"
                >
                  <RotateCcw
                    className="size-4 text-[#cf6b66]"
                    strokeWidth={1.9}
                  />
                  Reset verification
                </DropdownMenu.Item>
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  );
}

function ReviewerList({ reducedMotion }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Reviewers: Uzo, Victor, and Devin"
    >
      {REVIEWERS.map((member, index) => (
        <motion.div
          layout="position"
          key={member.id}
          className="flex h-9 items-center gap-2 rounded-full border border-black/[0.055] bg-white py-1 pl-1 pr-3 shadow-[0_1px_2px_rgba(0,0,0,0.035)]"
          initial={
            reducedMotion ? false : { opacity: 0, filter: "blur(5px)", y: -3 }
          }
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { delay: 0.1 + index * 0.03, duration: 0.2 }
          }
        >
          <motion.span layoutId={`avatar-${member.id}`}>
            <Avatar member={member} size="size-7" />
          </motion.span>
          <span className="text-[13px] text-[#62656b]">{member.name}</span>
        </motion.div>
      ))}
    </div>
  );
}

function DisclosureChevron({ expanded }) {
  return (
    <motion.span
      layoutId="disclosure-chevron"
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-full text-[#8a8c92]"
      animate={{ rotate: expanded ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 36 }}
    >
      <ChevronDown className="size-4" strokeWidth={2} />
    </motion.span>
  );
}

export default function MerchantOnboarding() {
  const reducedMotion = useReducedMotion();
  const generatedId = useId().replace(/:/g, "");
  const detailsId = `onboarding-details-${generatedId}`;
  const titleId = `onboarding-title-${generatedId}`;

  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [risk, setRisk] = useState("Elevated");
  const [reviewStatus, setReviewStatus] = useState("In review");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipSuppressed = useRef(false);
  const [justApproved, setJustApproved] = useState(false);

  const collapsedButtonRef = useRef(null);
  const expandedButtonRef = useRef(null);
  const pendingFocus = useRef(null);
  const wasComplete = useRef(false);
  const approveTimer = useRef(null);
  const suppressTimer = useRef(null);
  const pendingCollapse = useRef(false);

  const completedCount = useMemo(
    () => steps.filter((s) => s.completed).length,
    [steps],
  );
  const isComplete = completedCount === steps.length;
  const progress = Math.round(
    (completedCount / Math.max(steps.length, 1)) * 100,
  );

  useEffect(() => {
    if (isComplete && !wasComplete.current) {
      setReviewStatus("Approved");
      if (!reducedMotion) {
        setJustApproved(true);
        clearTimeout(approveTimer.current);
        approveTimer.current = setTimeout(() => setJustApproved(false), 1400);
      }
    }
    if (!isComplete && wasComplete.current && reviewStatus === "Approved") {
      setReviewStatus("In review");
    }
    wasComplete.current = isComplete;
  }, [isComplete, reducedMotion, reviewStatus]);

  useEffect(
    () => () => {
      clearTimeout(approveTimer.current);
      clearTimeout(suppressTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (pendingFocus.current === "expanded" && expanded) {
      expandedButtonRef.current?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
    if (pendingFocus.current === "collapsed" && !expanded) {
      collapsedButtonRef.current?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [expanded]);

  const openDetails = () => {
    pendingFocus.current = "expanded";
    setExpanded(true);
  };

  const handleActionsOpenChange = (open) => {
    setActionsOpen(open);
    if (!open) {
      tooltipSuppressed.current = true;
      setTooltipOpen(false);
      clearTimeout(suppressTimer.current);
      suppressTimer.current = setTimeout(() => {
        tooltipSuppressed.current = false;
      }, 500);
    }
  };

  const handleTooltipOpenChange = (open) => {
    if (open && (tooltipSuppressed.current || actionsOpen)) return;
    setTooltipOpen(open);
  };

  const closeDetails = () => {
    setTooltipOpen(false);
    pendingFocus.current = "collapsed";
    setExpanded(false);
  };

  const collapseFromMenu = () => {
    // Start the dropdown's exit, but DON'T collapse the panel yet.
    // We wait for the dropdown to fully unmount (its AnimatePresence
    // onExitComplete -> handleActionsClosed) before collapsing, so:
    //   1. the portaled dropdown node isn't orphaned mid-exit while its
    //      trigger is being torn down (that's the "hangs then pops" bug), and
    //   2. the expanded->collapsed swap stays a SINGLE atomic commit, so the
    //      shared-layout elements (brand-mark, avatars, risk/status pills)
    //      have their exiting copies present to morph from (no opacity flash).
    pendingCollapse.current = true;
    setTooltipOpen(false);
    setActionsOpen(false);
  };

  const handleActionsClosed = () => {
    if (!pendingCollapse.current) return;
    pendingCollapse.current = false;
    closeDetails();
  };

  const toggleStep = (id) => {
    setSteps((cur) =>
      cur.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)),
    );
  };

  const spring = reducedMotion
    ? { duration: 0 }
    : expanded
      ? { type: "spring", stiffness: 430, damping: 35, mass: 0.72 }
      : { type: "spring", stiffness: 560, damping: 42, mass: 0.66 };

  const revealInitial = reducedMotion
    ? false
    : { opacity: 0, filter: "blur(8px)", y: -7 };
  const revealExit = reducedMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        filter: "blur(7px)",
        y: -5,
        transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
      };

  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={0}>
      <main className="grid min-h-svh place-items-center bg-white px-4 py-12 text-[#35373c]">
        <MotionConfig transition={spring} reducedMotion="user">
          <LayoutGroup id={`onboarding-${generatedId}`}>
            <motion.section
              layout
              aria-label="Merchant onboarding"
              initial={false}
              animate={{
                padding: expanded ? 18 : 12,
                borderRadius: expanded ? 22 : 18,
                boxShadow: expanded
                  ? "0 22px 60px rgba(24, 24, 27, 0.105), 0 3px 10px rgba(24, 24, 27, 0.06)"
                  : "0 13px 36px rgba(24, 24, 27, 0.09), 0 2px 6px rgba(24, 24, 27, 0.05)",
              }}
              transition={{
                layout: spring,
                padding: spring,
                borderRadius: spring,
                boxShadow: { duration: reducedMotion ? 0 : 0.22 },
              }}
              className="relative w-full max-w-[404px] overflow-hidden border border-black/[0.055] bg-white"
            >
              <span aria-live="polite" aria-atomic="true" className="sr-only">
                {completedCount} of {steps.length} verification steps complete.
                {reviewStatus === "Approved" ? " Merchant approved." : ""}
              </span>

              <AnimatePresence initial={false} mode="popLayout">
                {!expanded ? (
                  <motion.div
                    key="collapsed"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ opacity: { duration: 0.15 } }}
                  >
                    <motion.button
                      ref={collapsedButtonRef}
                      type="button"
                      aria-expanded="false"
                      aria-controls={detailsId}
                      aria-label={`Expand Uzo Retail onboarding. ${completedCount} of ${steps.length} steps complete.`}
                      onClick={openDetails}
                      whileTap={reducedMotion ? undefined : { scale: 0.992 }}
                      className="group w-full cursor-pointer touch-manipulation rounded-[12px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#6f64ef]/55 focus-visible:ring-offset-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <motion.span layoutId="brand-mark">
                            <BrandMark />
                          </motion.span>
                          <span
                            id={titleId}
                            className="truncate whitespace-nowrap text-[16px] font-semibold tracking-[-0.015em] text-[#33353a]"
                          >
                            Uzo Retail Inc.
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <motion.span
                            layoutId="progress-track"
                            className="block"
                          >
                            <ProgressTrack
                              value={progress}
                              complete={isComplete}
                              className="w-[72px] sm:w-[88px]"
                            />
                          </motion.span>
                          <span className="w-9 text-right text-[13px] tabular-nums text-[#777a80]">
                            {progress}%
                          </span>
                          <DisclosureChevron expanded={false} />
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <CompactMetadata
                            kind="risk"
                            icon={ShieldCheck}
                            value={risk}
                            reducedMotion={reducedMotion}
                          />
                          <CompactMetadata
                            kind="status"
                            icon={CircleCheck}
                            value={reviewStatus}
                            reducedMotion={reducedMotion}
                          />
                        </div>
                        <div
                          className="flex shrink-0 -space-x-2"
                          aria-label="Reviewers"
                        >
                          {REVIEWERS.map((member) => (
                            <motion.span
                              layoutId={`avatar-${member.id}`}
                              key={member.id}
                            >
                              <Avatar member={member} size="size-7" />
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    layout
                    key="expanded"
                    id={detailsId}
                    role="region"
                    aria-labelledby={titleId}
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ opacity: { duration: 0.15 } }}
                  >
                    <header className="flex items-center justify-between gap-3">
                      <motion.button
                        ref={expandedButtonRef}
                        type="button"
                        aria-expanded="true"
                        aria-controls={detailsId}
                        aria-label="Collapse onboarding details"
                        onClick={closeDetails}
                        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
                        className="-m-1 flex min-h-11 min-w-0 flex-1 cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#6f64ef]/55"
                      >
                        <motion.span layoutId="brand-mark">
                          <BrandMark />
                        </motion.span>
                        <span
                          id={titleId}
                          className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[#303237]"
                        >
                          Uzo Retail Inc.
                        </span>
                        <DisclosureChevron expanded />
                      </motion.button>

                      <motion.div
                        initial={
                          reducedMotion ? false : { opacity: 0, scale: 0.9 }
                        }
                        animate={{ opacity: 1, scale: 1 }}
                        exit={
                          reducedMotion
                            ? { opacity: 0 }
                            : {
                                opacity: 0,
                                scale: 0.9,
                                transition: { duration: 0.09 },
                              }
                        }
                        transition={{
                          delay: reducedMotion ? 0 : 0.12,
                          duration: 0.18,
                        }}
                      >
                        <ActionsMenu
                          open={actionsOpen}
                          onOpenChange={handleActionsOpenChange}
                          onClosed={handleActionsClosed}
                          tooltipOpen={tooltipOpen}
                          onTooltipChange={handleTooltipOpenChange}
                          onCollapse={collapseFromMenu}
                          onReset={() => setSteps(INITIAL_STEPS)}
                          onCompleteAll={() =>
                            setSteps((cur) =>
                              cur.map((s) => ({ ...s, completed: true })),
                            )
                          }
                        />
                      </motion.div>
                    </header>

                    <motion.div
                      initial={revealInitial}
                      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      exit={revealExit}
                      transition={{
                        opacity: {
                          delay: reducedMotion ? 0 : 0.08,
                          duration: reducedMotion ? 0 : 0.2,
                        },
                        filter: {
                          delay: reducedMotion ? 0 : 0.07,
                          duration: reducedMotion ? 0 : 0.22,
                        },
                        y: spring,
                      }}
                      className="space-y-4"
                    >
                      <div
                        role="progressbar"
                        aria-label="Verification completion"
                        aria-valuemin={0}
                        aria-valuemax={steps.length}
                        aria-valuenow={completedCount}
                        aria-valuetext={`${completedCount} of ${steps.length} steps complete`}
                        className="relative flex h-9 items-center gap-3 overflow-hidden rounded-full border border-black/[0.055] bg-[#fbfbfc] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                      >
                        <motion.span
                          aria-hidden="true"
                          animate={{
                            color: isComplete ? "#3fb765" : "#b3b5ba",
                          }}
                          transition={{ duration: 0.3 }}
                          className="shrink-0"
                        >
                          <CircleCheck className="size-4" strokeWidth={1.8} />
                        </motion.span>
                        <span className="whitespace-nowrap text-[12px] font-medium text-[#85888e]">
                          <AnimatedCount
                            count={completedCount}
                            suffix={` of ${steps.length}`}
                            reducedMotion={reducedMotion}
                          />
                        </span>
                        <motion.span
                          layoutId="progress-track"
                          className="block min-w-0 flex-1"
                        >
                          <ProgressTrack
                            value={progress}
                            complete={isComplete}
                            className="w-full"
                          />
                        </motion.span>
                        <span className="w-9 text-right text-[12px] tabular-nums text-[#85888e]">
                          {progress}%
                        </span>

                        <AnimatePresence>
                          {justApproved && (
                            <motion.span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0"
                              initial={{ opacity: 0, x: "-100%" }}
                              animate={{ opacity: [0, 0.5, 0], x: "100%" }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.9, ease: "easeOut" }}
                              style={{
                                background:
                                  "linear-gradient(100deg, transparent, rgba(63,183,101,0.22), transparent)",
                              }}
                            />
                          )}
                        </AnimatePresence>
                      </div>

                      <StepChecklist
                        steps={steps}
                        onToggle={toggleStep}
                        reducedMotion={reducedMotion}
                      />

                      <div className="space-y-2">
                        <MetadataSelect
                          kind="risk"
                          label="Risk tier"
                          icon={ShieldCheck}
                          value={risk}
                          options={RISK_TIERS}
                          onValueChange={setRisk}
                          reducedMotion={reducedMotion}
                        />
                        <MetadataSelect
                          kind="status"
                          label="Status"
                          icon={CircleCheck}
                          value={reviewStatus}
                          options={REVIEW_STATUSES}
                          onValueChange={setReviewStatus}
                          reducedMotion={reducedMotion}
                        />
                      </div>

                      <ReviewerList reducedMotion={reducedMotion} />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </LayoutGroup>
        </MotionConfig>
      </main>
    </Tooltip.Provider>
  );
}
