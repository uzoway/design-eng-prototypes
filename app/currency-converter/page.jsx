"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
} from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Globe,
  X,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Info,
  ArrowUpDown,
  Loader2,
} from "lucide-react";

const layoutSpring = { type: "spring", stiffness: 400, damping: 32 };
const microSpring = { type: "spring", stiffness: 500, damping: 30 };
const EASE = [0.32, 0.72, 0, 1];

const ACCOUNTS = [
  {
    id: "usd-primary",
    name: "Primary account",
    currency: "USD",
    symbol: "$",
    balance: 5345.02,
    flag: "🇺🇸",
    rate: 1,
  },
  {
    id: "eur-primary",
    name: "Primary account",
    currency: "EUR",
    symbol: "€",
    balance: 52.23,
    flag: "🇪🇺",
    rate: 0.87,
  },
  {
    id: "gbp-biz",
    name: "Business account",
    currency: "GBP",
    symbol: "£",
    balance: 12450.8,
    flag: "🇬🇧",
    rate: 0.79,
  },
];

const formatCurrency = (value, currency) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

function AccountSelector({ label, selectedId, onSelect, excludeId }) {
  const [open, setOpen] = useState(false);
  const selected = ACCOUNTS.find((a) => a.id === selectedId) || ACCOUNTS[0];
  const availableAccounts = ACCOUNTS.filter((a) => a.id !== excludeId);

  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      <label className="text-[13px] font-semibold text-slate-600">
        {label}
      </label>

      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <motion.button
            whileHover={{ backgroundColor: "#FAFAFA" }}
            whileTap={{ scale: 0.985 }}
            transition={microSpring}
            aria-label={`Select ${label} account`}
            className="flex items-center justify-between w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#635BFF] focus-visible:border-transparent transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-6 rounded flex items-center justify-center border border-slate-200 text-sm overflow-hidden bg-slate-50">
                {selected.flag}
              </div>
              <div className="flex flex-col items-start leading-tight gap-0.5">
                <span className="text-[14px] font-semibold text-slate-900">
                  {selected.name}
                </span>
                <span className="text-[13px] text-slate-500 font-medium">
                  {selected.currency}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-medium text-slate-900">
                {formatCurrency(selected.balance, selected.currency)}
              </span>
              <ChevronsUpDown size={16} className="text-slate-400" />
            </div>
          </motion.button>
        </DropdownMenu.Trigger>

        <AnimatePresence>
          {open && (
            <DropdownMenu.Portal forceMount>
              <DropdownMenu.Content
                asChild
                sideOffset={8}
                align="start"
                className="z-50 w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={microSpring}
                  className="bg-white rounded-lg shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] border border-slate-100 p-1 origin-top"
                >
                  {availableAccounts.map((account) => (
                    <DropdownMenu.Item
                      key={account.id}
                      onSelect={() => onSelect(account.id)}
                      className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer outline-none hover:bg-slate-100 focus:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-6 rounded border border-slate-200 text-sm flex items-center justify-center bg-slate-50">
                          {account.flag}
                        </div>
                        <div className="flex flex-col leading-tight gap-0.5">
                          <span className="text-[14px] font-semibold text-slate-900">
                            {account.name}
                          </span>
                          <span className="text-[13px] text-slate-500 font-medium">
                            {account.currency}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[14px] font-medium text-slate-900">
                          {formatCurrency(account.balance, account.currency)}
                        </span>
                        {selected.id === account.id ? (
                          <Check size={16} className="text-[#635BFF]" />
                        ) : (
                          <div className="w-4" />
                        )}
                      </div>
                    </DropdownMenu.Item>
                  ))}
                </motion.div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          )}
        </AnimatePresence>
      </DropdownMenu.Root>
    </div>
  );
}

function ReceivedAmount({ value, symbol, reducedMotion }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => `${symbol}${v.toFixed(2)}`);

  useEffect(() => {
    if (reducedMotion) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.4, ease: EASE });
    return controls.stop;
  }, [value, mv, reducedMotion]);

  return (
    <span className="text-[15px] text-slate-900 font-semibold tracking-tight tabular-nums">
      <motion.span>{rounded}</motion.span>
    </span>
  );
}

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("100.00");
  const [fromId, setFromId] = useState("usd-primary");
  const [toId, setToId] = useState("eur-primary");
  const [feesExpanded, setFeesExpanded] = useState(true);
  const [swapCount, setSwapCount] = useState(0);
  const [reviewState, setReviewState] = useState("idle");
  const reducedMotion = useReducedMotion();

  const shakeX = useMotionValue(0);
  const wasError = useRef(false);
  const reviewTimers = useRef([]);

  const fromAccount = ACCOUNTS.find((a) => a.id === fromId);
  const toAccount = ACCOUNTS.find((a) => a.id === toId);

  const numericAmount = parseFloat(amount) || 0;
  const isError = numericAmount > fromAccount.balance;
  const conversionRate = toAccount.rate / fromAccount.rate;

  const feePercentage = 0.005;
  const feeAmount = numericAmount * feePercentage;
  const totalDeducted = numericAmount + feeAmount;
  const received = numericAmount * conversionRate;

  const isActionable = !isError && numericAmount > 0 && reviewState === "idle";

  useEffect(() => () => reviewTimers.current.forEach(clearTimeout), []);

  const handleReview = () => {
    if (!isActionable) return;
    setReviewState("loading");
    reviewTimers.current.push(
      setTimeout(() => setReviewState("success"), 1100),
      setTimeout(() => setReviewState("idle"), 2600),
    );
  };

  useEffect(() => {
    if (isError && !wasError.current && !reducedMotion) {
      animate(shakeX, [0, -4, 4, -3, 3, 0], {
        duration: 0.4,
        ease: "easeInOut",
      });
    }
    wasError.current = isError;
  }, [isError, reducedMotion, shakeX]);

  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    if (val.split(".").length > 2) return;
    if (val.length > 9) return;
    setAmount(val);
  };

  const handleSwap = () => {
    setFromId(toId);
    setToId(fromId);
    setSwapCount((c) => c + 1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4e4ff] via-[#eedaff] to-[#fce0f0] p-4 font-sans text-slate-900 cursor-default selection:bg-[#635BFF] selection:text-white">
      <LayoutGroup>
        <motion.div
          layout
          transition={layoutSpring}
          className="w-full max-w-[400px] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden p-6 relative"
          style={{ borderRadius: 12 }}
        >
          <motion.header
            layout
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-slate-700" strokeWidth={2.5} />
              <h1 className="text-[15px] font-semibold tracking-tight">
                Convert
              </h1>
            </div>
            <button
              aria-label="Close"
              className="p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#635BFF] cursor-pointer"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </motion.header>

          <div className="flex flex-col items-center mb-8">
            <p className="text-[13px] text-slate-500 mb-3 font-medium">
              Instantly convert between currencies
            </p>

            <motion.div
              className="flex items-baseline gap-2"
              style={{ x: shakeX }}
            >
              <span className="text-2xl font-semibold text-slate-500 translate-y-[-2px]">
                {fromAccount.symbol}
              </span>

              <div className="relative flex justify-center group cursor-text">
                <span
                  className="invisible whitespace-pre px-0.5 text-5xl font-bold tracking-tight"
                  aria-hidden="true"
                >
                  {amount || "0"}
                </span>

                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3.5px] rounded-full transition-colors ${
                    isError
                      ? "bg-red-500"
                      : "bg-slate-900 group-focus-within:bg-[#635BFF]"
                  }`}
                />

                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  aria-label="Amount to convert"
                  className={`absolute inset-0 w-full bg-transparent text-center text-5xl font-bold tracking-tight outline-none cursor-text transition-colors ${
                    isError ? "text-red-500" : "text-slate-900"
                  }`}
                />
              </div>

              <span className="text-xl font-semibold text-slate-500">
                {fromAccount.currency}
              </span>
            </motion.div>

            <AnimatePresence initial={false}>
              {isError && (
                <motion.p
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  className="text-[13px] text-red-500 font-medium overflow-hidden"
                >
                  Amount exceeds available balance
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <motion.div layout className="flex flex-col gap-3 mb-6 relative">
            <AccountSelector
              label="From"
              selectedId={fromId}
              excludeId={toId}
              onSelect={setFromId}
            />

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <motion.button
                onClick={handleSwap}
                aria-label="Swap From and To accounts"
                whileTap={{ scale: 0.9 }}
                transition={microSpring}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-[0_2px_6px_rgba(0,0,0,0.08)] flex items-center justify-center text-slate-600 hover:text-[#635BFF] hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#635BFF] cursor-pointer"
              >
                <motion.div
                  animate={{ rotate: swapCount * 180 }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 400, damping: 28 }
                  }
                >
                  <ArrowUpDown size={16} />
                </motion.div>
              </motion.button>
            </div>

            <AccountSelector
              label="To"
              selectedId={toId}
              excludeId={fromId}
              onSelect={setToId}
            />
          </motion.div>

          <motion.div
            layout
            className="bg-slate-50 rounded-lg p-4 mb-6 overflow-hidden flex flex-col border border-slate-100"
          >
            <button
              onClick={() => setFeesExpanded(!feesExpanded)}
              aria-expanded={feesExpanded}
              className="flex items-center justify-between w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#635BFF] rounded cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-[14px] text-slate-600 font-medium">
                <motion.div
                  animate={{ rotate: feesExpanded ? 180 : 0 }}
                  transition={microSpring}
                >
                  <ChevronDown size={16} />
                </motion.div>
                Fees and exchange rate
              </div>
              <span className="text-[14px] font-medium text-slate-900 tabular-nums">
                {fromAccount.symbol}
                {feeAmount.toFixed(2)}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {feesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={layoutSpring}
                  className="overflow-hidden"
                >
                  <div className="pt-4 flex flex-col gap-2.5 text-[13px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Amount converted</span>
                      <span className="text-slate-900 font-medium tabular-nums">
                        {fromAccount.symbol}
                        {numericAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Currency conversion fee</span>
                      <span className="text-slate-900 font-medium tabular-nums">
                        {fromAccount.symbol}
                        {feeAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total amount deducted</span>
                      <span className="text-slate-900 font-medium tabular-nums">
                        {fromAccount.symbol}
                        {totalDeducted.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 items-center pt-1.5">
                      <span className="flex items-center gap-1.5">
                        Exchange rate
                        <Tooltip.Provider delayDuration={150}>
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <button
                                type="button"
                                aria-label="About the exchange rate"
                                className="flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-help outline-none focus-visible:ring-2 focus-visible:ring-[#635BFF]"
                              >
                                <Info size={14} />
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                asChild
                                side="top"
                                align="center"
                                sideOffset={6}
                              >
                                <motion.div
                                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ duration: 0.15, ease: EASE }}
                                  className="max-w-[220px] bg-slate-900 text-white text-[12px] font-medium leading-snug rounded-lg px-2.5 py-1.5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] z-50"
                                >
                                  Rate includes a standard market markup.
                                  Updated in real time.
                                  <Tooltip.Arrow
                                    className="fill-slate-900"
                                    width={10}
                                    height={5}
                                  />
                                </motion.div>
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </span>
                      <span className="text-slate-900 font-medium tabular-nums">
                        {fromAccount.symbol}1 {fromAccount.currency} ={" "}
                        {toAccount.symbol}
                        {conversionRate.toFixed(2)} {toAccount.currency}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div layout className="flex items-center justify-between mb-6">
            <span className="text-[14px] font-semibold text-slate-900">
              You'll receive
            </span>
            <div className="border border-slate-200 rounded-lg py-2 px-3 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-w-[140px] text-right">
              <ReceivedAmount
                value={received}
                symbol={toAccount.symbol}
                reducedMotion={reducedMotion}
              />
            </div>
          </motion.div>

          <motion.div layout className="flex justify-end">
            <motion.button
              onClick={handleReview}
              whileHover={isActionable ? { filter: "brightness(1.05)" } : {}}
              whileTap={isActionable ? { scale: 0.96 } : {}}
              transition={microSpring}
              disabled={!isActionable}
              aria-live="polite"
              className={`relative px-6 py-2.5 rounded-[10px] font-semibold text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors w-[132px] h-[42px] flex items-center justify-center overflow-hidden ${
                isActionable
                  ? "bg-[#635BFF] text-white focus-visible:ring-[#635BFF] hover:bg-[#5851e5] cursor-pointer"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {reviewState === "idle" && (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
                  >
                    Review
                  </motion.span>
                )}
                {reviewState === "loading" && (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="flex"
                    >
                      <Loader2 size={15} />
                    </motion.span>
                    Reviewing
                  </motion.span>
                )}
                {reviewState === "success" && (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Check size={15} strokeWidth={2.5} />
                    Confirmed
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
