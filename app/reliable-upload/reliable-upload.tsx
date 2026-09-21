"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type NetworkMode = "normal" | "slow" | "offline";

export type MotionMode = "auto" | "full" | "reduced";

type UploadStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "processing"
  | "ready"
  | "failed"
  | "canceled"
  | "rejected";

type UploadItem = {
  id: string;
  file: File;
  key: string;
  status: UploadStatus;
  progress: number;
  processingEndsAt?: number;
  errorTitle?: string;
  errorMessage?: string;
};

type BatchNotice = {
  id: number;
  message: string;
};

type ReliableUploadProps = {
  networkMode?: NetworkMode;
  motionMode?: MotionMode;
  failNextArmed?: boolean;
  onFailNextConsumed?: () => void;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const MAX_FILES = 5;

const MAX_CONCURRENT_UPLOADS = 3;

const ACCEPTED_EXTENSIONS = new Set(["pdf", "docx", "png", "jpg", "jpeg"]);

const ACCEPT_ATTRIBUTE = [".pdf", ".docx", ".png", ".jpg", ".jpeg"].join(",");

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string) {
  const index = name.lastIndexOf(".");

  if (index === -1 || index === name.length - 1) {
    return "";
  }

  return name.slice(index + 1).toLowerCase();
}

function getFileKey(file: File) {
  return [file.name, file.size, file.lastModified].join(":");
}

function splitFileName(name: string) {
  const index = name.lastIndexOf(".");

  if (index <= 0 || index === name.length - 1) {
    return {
      stem: name,
      extension: "",
    };
  }

  return {
    stem: name.slice(0, index),
    extension: name.slice(index),
  };
}

function validateFile(file: File) {
  if (file.size === 0) {
    return {
      title: "This file is empty",
      message: "Choose a file that contains data.",
    };
  }

  const extension = getFileExtension(file.name);

  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    return {
      title: "Unsupported file type",
      message: "Choose a PDF, DOCX, PNG or JPG.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      title: "File is too large",
      message: `This file is ${formatBytes(
        file.size,
      )}. Maximum file size is 25 MB.`,
    };
  }

  return null;
}

function isValidSlotStatus(status: UploadStatus) {
  return status !== "rejected";
}

function getStatusText(item: UploadItem) {
  switch (item.status) {
    case "queued":
      return "Waiting";

    case "uploading":
      return `Uploading · ${Math.round(item.progress)}%`;

    case "paused":
      return `Paused · ${Math.round(item.progress)}%`;

    case "processing":
      return "Processing…";

    case "ready":
      return "Ready";

    case "failed":
      return item.errorTitle ?? "Upload failed";

    case "canceled":
      return "Canceled";

    case "rejected":
      return item.errorTitle ?? "File not added";

    default:
      return "";
  }
}

function getSummary(items: UploadItem[]) {
  const valid = items.filter(function filterValid(item) {
    return isValidSlotStatus(item.status);
  });

  const ready = valid.filter(function filterReady(item) {
    return item.status === "ready";
  }).length;

  const attention = valid.filter(function filterAttention(item) {
    return item.status === "failed" || item.status === "canceled";
  }).length;

  if (valid.length === 0) {
    return "";
  }

  if (ready === valid.length) {
    return `${ready} ${ready === 1 ? "file" : "files"} ready`;
  }

  if (ready > 0 && attention > 0) {
    return `${ready} ready · ${attention} ${
      attention === 1 ? "needs" : "need"
    } attention`;
  }

  if (attention > 0) {
    return `${attention} ${
      attention === 1 ? "file needs" : "files need"
    } attention`;
  }

  return `${ready} of ${valid.length} ready`;
}

function getProcessingDuration(file: File) {
  return 700 + (file.size % 650);
}

function EmptyUploadGlyph({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const transition = reducedMotion
    ? {
        duration: 0,
      }
    : {
        type: "spring" as const,
        duration: 0.42,
        bounce: 0,
      };

  return (
    <svg data-empty-glyph viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <motion.line
        initial={false}
        animate={{
          x1: 24,
          y1: active ? 10 : 13,
          x2: 24,
          y2: active ? 26 : 28,
        }}
        transition={transition}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <motion.line
        initial={false}
        animate={{
          x1: active ? 18 : 19,
          y1: active ? 16 : 19,
          x2: 24,
          y2: active ? 10 : 13,
        }}
        transition={transition}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <motion.line
        initial={false}
        animate={{
          x1: active ? 30 : 29,
          y1: active ? 16 : 19,
          x2: 24,
          y2: active ? 10 : 13,
        }}
        transition={transition}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <motion.path
        initial={false}
        animate={{
          d: active
            ? "M 14 33 C 17 34.5 20.3 35.3 24 35.3 C 27.7 35.3 31 34.5 34 33"
            : "M 14 34 C 17 34 20.3 34 24 34 C 27.7 34 31 34 34 34",
        }}
        transition={transition}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StatusGlyphProps = {
  status: UploadStatus;
  progress: number;
  reducedMotion: boolean;
};

function StatusGlyph({ status, progress, reducedMotion }: StatusGlyphProps) {
  const isRing =
    status === "uploading" || status === "paused" || status === "processing";

  const processing = status === "processing";

  const lineTransition = reducedMotion
    ? {
        duration: 0,
      }
    : {
        type: "spring" as const,
        duration: 0.34,
        bounce: 0,
      };

  const progressTransition = reducedMotion
    ? {
        duration: 0,
      }
    : {
        duration: 0.14,
        ease: "easeOut" as const,
      };

  let lineA = {
    x1: 10,
    y1: 10,
    x2: 10,
    y2: 10,
    opacity: 0,
  };

  let lineB = {
    ...lineA,
  };

  let dot = {
    cx: 10,
    cy: 10,
    r: 0,
    opacity: 0,
  };

  if (status === "queued") {
    dot = {
      cx: 10,
      cy: 10,
      r: 1.7,
      opacity: 0.62,
    };
  }

  if (status === "paused") {
    lineA = {
      x1: 7.7,
      y1: 7,
      x2: 7.7,
      y2: 13,
      opacity: 1,
    };

    lineB = {
      x1: 12.3,
      y1: 7,
      x2: 12.3,
      y2: 13,
      opacity: 1,
    };
  }

  if (status === "ready") {
    lineA = {
      x1: 4.8,
      y1: 10.4,
      x2: 8.3,
      y2: 13.9,
      opacity: 1,
    };

    lineB = {
      x1: 8.3,
      y1: 13.9,
      x2: 15.3,
      y2: 6.7,
      opacity: 1,
    };
  }

  if (status === "failed" || status === "rejected") {
    lineA = {
      x1: 10,
      y1: 4.8,
      x2: 10,
      y2: 11.5,
      opacity: 1,
    };

    dot = {
      cx: 10,
      cy: 15,
      r: 1.15,
      opacity: 1,
    };
  }

  if (status === "canceled") {
    lineA = {
      x1: 5.7,
      y1: 5.7,
      x2: 14.3,
      y2: 14.3,
      opacity: 1,
    };

    lineB = {
      x1: 14.3,
      y1: 5.7,
      x2: 5.7,
      y2: 14.3,
      opacity: 1,
    };
  }

  const ringProgress = clamp(progress / 100, 0, 1);

  return (
    <svg data-status-glyph viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <motion.g
        initial={false}
        animate={{
          rotate: processing && !reducedMotion ? 360 : 0,
        }}
        transition={
          processing && !reducedMotion
            ? {
                duration: 1.1,
                repeat: Infinity,
                ease: "linear",
              }
            : {
                duration: 0,
              }
        }
        style={{
          transformOrigin: "10px 10px",
        }}
      >
        <motion.circle
          initial={false}
          animate={{
            r: isRing ? 7.4 : 1,
            opacity: isRing ? 1 : 0,
            strokeDashoffset: processing ? 0 : 1 - ringProgress,
            strokeDasharray: processing ? "0.68 0.32" : "1 1",
          }}
          transition={{
            r: lineTransition,
            opacity: lineTransition,
            strokeDashoffset: progressTransition,
          }}
          cx="10"
          cy="10"
          pathLength="1"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </motion.g>

      <motion.line
        initial={false}
        animate={lineA}
        transition={lineTransition}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <motion.line
        initial={false}
        animate={lineB}
        transition={lineTransition}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <motion.circle
        initial={false}
        animate={dot}
        transition={lineTransition}
        fill="currentColor"
      />
    </svg>
  );
}

function FileName({ name }: { name: string }) {
  const { stem, extension } = splitFileName(name);

  return (
    <span data-file-name>
      <span data-file-stem>{stem}</span>

      {extension && <span data-file-extension>{extension}</span>}
    </span>
  );
}

function FileAction({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" data-file-action onClick={onClick}>
      {children}
    </button>
  );
}

type FileRowProps = {
  item: UploadItem;
  highlighted: boolean;
  reducedMotion: boolean;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  registerRow: (id: string, element: HTMLLIElement | null) => void;
};

function FileRow({
  item,
  highlighted,
  reducedMotion,
  onCancel,
  onRetry,
  onRemove,
  registerRow,
}: FileRowProps) {
  const statusText = getStatusText(item);

  const uploading = item.status === "uploading" || item.status === "paused";

  const error = item.status === "failed" || item.status === "rejected";

  const layoutTransition = reducedMotion
    ? {
        duration: 0,
      }
    : {
        type: "spring" as const,
        duration: 0.42,
        bounce: 0,
      };

  return (
    <motion.li
      ref={function setRef(element) {
        registerRow(item.id, element);
      }}
      layout={!reducedMotion}
      initial={
        reducedMotion
          ? {
              opacity: 0,
            }
          : {
              opacity: 0,
              y: 6,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: highlighted
          ? "rgba(32,32,30,.055)"
          : "rgba(32,32,30,0)",
      }}
      exit={
        reducedMotion
          ? {
              opacity: 0,
            }
          : {
              opacity: 0,
              y: -4,
            }
      }
      transition={{
        ...layoutTransition,
        backgroundColor: {
          duration: 0.22,
        },
      }}
      data-file-row
      data-error={error ? "true" : "false"}
    >
      <div data-file-icon>
        <StatusGlyph
          status={item.status}
          progress={item.progress}
          reducedMotion={reducedMotion}
        />
      </div>

      <div data-file-content>
        <div data-file-heading>
          <FileName name={item.file.name} />

          <span data-file-size>{formatBytes(item.file.size)}</span>
        </div>

        <div data-file-status-row>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={statusText}
              data-file-status
              initial={
                reducedMotion
                  ? {
                      opacity: 0,
                    }
                  : {
                      opacity: 0,
                      y: 2,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={
                reducedMotion
                  ? {
                      opacity: 0,
                    }
                  : {
                      opacity: 0,
                      y: -2,
                    }
              }
              transition={{
                duration: reducedMotion ? 0.1 : 0.18,
                ease: "easeOut",
              }}
            >
              {statusText}
            </motion.span>
          </AnimatePresence>

          <div data-file-actions>
            {(item.status === "uploading" || item.status === "paused") && (
              <FileAction
                onClick={function handleCancel() {
                  onCancel(item.id);
                }}
              >
                Cancel
              </FileAction>
            )}

            {item.status === "queued" && (
              <FileAction
                onClick={function handleRemove() {
                  onRemove(item.id);
                }}
              >
                Remove
              </FileAction>
            )}

            {(item.status === "failed" || item.status === "canceled") && (
              <>
                <FileAction
                  onClick={function handleRetry() {
                    onRetry(item.id);
                  }}
                >
                  Retry
                </FileAction>

                <FileAction
                  onClick={function handleRemove() {
                    onRemove(item.id);
                  }}
                >
                  Remove
                </FileAction>
              </>
            )}

            {(item.status === "ready" || item.status === "rejected") && (
              <FileAction
                onClick={function handleRemove() {
                  onRemove(item.id);
                }}
              >
                Remove
              </FileAction>
            )}
          </div>
        </div>

        {uploading && (
          <div
            data-progress
            role="progressbar"
            aria-label={`${item.file.name} upload progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(item.progress)}
          >
            <motion.span
              initial={false}
              animate={{
                scaleX: item.progress / 100,
              }}
              transition={
                reducedMotion
                  ? {
                      duration: 0,
                    }
                  : {
                      duration: 0.14,
                      ease: "easeOut",
                    }
              }
            />
          </div>
        )}

        {error && item.errorMessage && (
          <motion.p layout={!reducedMotion} data-error-message>
            {item.errorMessage}
          </motion.p>
        )}
      </div>
    </motion.li>
  );
}

export function ReliableUpload({
  networkMode = "normal",
  motionMode = "auto",
  failNextArmed = false,
  onFailNextConsumed,
}: ReliableUploadProps) {
  const systemReducedMotion = Boolean(useReducedMotion());

  const reducedMotion =
    motionMode === "reduced" || (motionMode === "auto" && systemReducedMotion);

  const inputRef = useRef<HTMLInputElement>(null);

  const addButtonRef = useRef<HTMLButtonElement>(null);

  const dragDepthRef = useRef(0);

  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const previousNetworkRef = useRef<NetworkMode>(networkMode);

  const previousStatusesRef = useRef(new Map<string, UploadStatus>());

  const lastTickRef = useRef(Date.now());

  const [items, setItems] = useState<UploadItem[]>([]);

  const [dragActive, setDragActive] = useState(false);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [batchNotice, setBatchNotice] = useState<BatchNotice | null>(null);

  const [connectionMessage, setConnectionMessage] = useState<string | null>(
    null,
  );

  const [liveMessage, setLiveMessage] = useState("");

  const validCount = items.filter(function countValid(item) {
    return isValidSlotStatus(item.status);
  }).length;

  const hasItems = items.length > 0;

  const summary = getSummary(items);

  const atLimit = validCount >= MAX_FILES;

  const openPicker = useCallback(function openPicker() {
    inputRef.current?.click();
  }, []);

  const emphasizeExisting = useCallback(function emphasizeExisting(
    id: string,
    name: string,
  ) {
    setHighlightedId(id);

    setLiveMessage(`${name} is already added.`);

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = setTimeout(function clearHighlight() {
      setHighlightedId(null);
    }, 750);
  }, []);

  const addFiles = useCallback(
    function addFiles(incomingFiles: File[]) {
      if (incomingFiles.length === 0) {
        return;
      }

      setItems(function addToCurrent(current) {
        const existingKeys = new Map(
          current.map(function mapItem(item) {
            return [item.key, item];
          }),
        );

        let availableSlots =
          MAX_FILES -
          current.filter(function countValid(item) {
            return isValidSlotStatus(item.status);
          }).length;

        let accepted = 0;
        let overflow = 0;
        let hiddenRejected = 0;
        let visibleRejected = 0;

        const next = [...current];

        for (const file of incomingFiles) {
          const key = getFileKey(file);

          const duplicate = existingKeys.get(key);

          if (duplicate) {
            queueMicrotask(function emphasizeDuplicate() {
              emphasizeExisting(duplicate.id, duplicate.file.name);
            });

            continue;
          }

          const validation = validateFile(file);

          if (validation) {
            if (visibleRejected < 3) {
              const item: UploadItem = {
                id: createId(),
                file,
                key,
                status: "rejected",
                progress: 0,
                errorTitle: validation.title,
                errorMessage: validation.message,
              };

              next.push(item);

              existingKeys.set(key, item);

              visibleRejected += 1;
            } else {
              hiddenRejected += 1;
            }

            continue;
          }

          if (availableSlots <= 0) {
            overflow += 1;
            continue;
          }

          const item: UploadItem = {
            id: createId(),
            file,
            key,
            status: "queued",
            progress: 0,
          };

          next.push(item);

          existingKeys.set(key, item);

          availableSlots -= 1;
          accepted += 1;
        }

        const notAdded = overflow + hiddenRejected;

        if (notAdded > 0) {
          queueMicrotask(function showNotice() {
            setBatchNotice({
              id: Date.now(),
              message:
                overflow > 0
                  ? `${notAdded} ${
                      notAdded === 1 ? "file wasn't" : "files weren't"
                    } added. You can upload up to ${MAX_FILES} files at once.`
                  : `${notAdded} ${
                      notAdded === 1 ? "file wasn't" : "files weren't"
                    } added.`,
            });
          });
        } else {
          queueMicrotask(function clearNotice() {
            setBatchNotice(null);
          });
        }

        if (accepted > 0) {
          queueMicrotask(function announceFiles() {
            setLiveMessage(
              `${accepted} ${accepted === 1 ? "file" : "files"} added.`,
            );
          });
        }

        return next;
      });
    },
    [emphasizeExisting],
  );

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);

    addFiles(files);

    event.currentTarget.value = "";
  }

  function handleDragEnter(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current += 1;

    setDragActive(true);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = 0;

    setDragActive(false);

    const files = Array.from(event.dataTransfer.files);

    addFiles(files);
  }

  function cancelItem(id: string) {
    setItems(function cancelCurrent(current) {
      return current.map(function updateItem(item) {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          status: "canceled",
        };
      });
    });
  }

  function retryItem(id: string) {
    setItems(function retryCurrent(current) {
      return current.map(function updateItem(item) {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          status: "queued",
          errorTitle: undefined,
          errorMessage: undefined,
        };
      });
    });
  }

  function removeItem(id: string) {
    const index = items.findIndex(function findItem(item) {
      return item.id === id;
    });

    const row = rowRefs.current.get(id);

    const hadFocus = Boolean(row?.contains(document.activeElement));

    const nextId = items[index + 1]?.id ?? items[index - 1]?.id;

    setItems(function removeCurrent(current) {
      return current.filter(function keepItem(item) {
        return item.id !== id;
      });
    });

    if (hadFocus) {
      requestAnimationFrame(function restoreFocus() {
        if (nextId) {
          const nextRow = rowRefs.current.get(nextId);

          const button = nextRow?.querySelector<HTMLButtonElement>("button");

          if (button) {
            button.focus();
            return;
          }
        }

        addButtonRef.current?.focus();
      });
    }
  }

  const registerRow = useCallback(function registerRow(
    id: string,
    element: HTMLLIElement | null,
  ) {
    if (element) {
      rowRefs.current.set(id, element);

      return;
    }

    rowRefs.current.delete(id);
  }, []);

  useEffect(
    function syncNetworkState() {
      setItems(function updateNetworkState(current) {
        let changed = false;

        const next = current.map(function updateItem(item) {
          if (networkMode === "offline" && item.status === "uploading") {
            changed = true;

            return {
              ...item,
              status: "paused" as const,
            };
          }

          if (networkMode !== "offline" && item.status === "paused") {
            changed = true;

            return {
              ...item,
              status: "uploading" as const,
            };
          }

          return item;
        });

        return changed ? next : current;
      });

      const previous = previousNetworkRef.current;

      if (previous === "offline" && networkMode !== "offline") {
        setConnectionMessage("Back online. Resuming uploads…");

        if (connectionTimerRef.current) {
          clearTimeout(connectionTimerRef.current);
        }

        connectionTimerRef.current = setTimeout(
          function clearConnectionMessage() {
            setConnectionMessage(null);
          },
          1200,
        );
      }

      previousNetworkRef.current = networkMode;
    },
    [networkMode],
  );

  useEffect(
    function scheduleUploads() {
      if (networkMode === "offline") {
        return;
      }

      const active = items.filter(function countActive(item) {
        return item.status === "uploading";
      }).length;

      const spaces = MAX_CONCURRENT_UPLOADS - active;

      if (spaces <= 0) {
        return;
      }

      const queued = items
        .filter(function findQueued(item) {
          return item.status === "queued";
        })
        .slice(0, spaces);

      if (queued.length === 0) {
        return;
      }

      const queuedIds = new Set(
        queued.map(function getId(item) {
          return item.id;
        }),
      );

      setItems(function startQueued(current) {
        return current.map(function updateItem(item) {
          if (!queuedIds.has(item.id)) {
            return item;
          }

          return {
            ...item,
            status: "uploading",
          };
        });
      });
    },
    [items, networkMode],
  );

  useEffect(
    function runUploadClock() {
      lastTickRef.current = Date.now();

      const interval = window.setInterval(function tick() {
        const now = Date.now();

        const elapsed = (now - lastTickRef.current) / 1000;

        lastTickRef.current = now;

        if (networkMode === "offline") {
          return;
        }

        const speed = networkMode === "slow" ? 6 : 18;

        setItems(function advanceItems(current) {
          let changed = false;

          const next = current.map(function advanceItem(item) {
            if (item.status === "uploading") {
              const nextProgress = clamp(item.progress + speed * elapsed);

              changed = true;

              if (nextProgress >= 100) {
                return {
                  ...item,
                  progress: 100,
                  status: "processing" as const,
                  processingEndsAt: now + getProcessingDuration(item.file),
                };
              }

              return {
                ...item,
                progress: nextProgress,
              };
            }

            if (
              item.status === "processing" &&
              item.processingEndsAt &&
              now >= item.processingEndsAt
            ) {
              changed = true;

              return {
                ...item,
                status: "ready" as const,
                processingEndsAt: undefined,
              };
            }

            return item;
          });

          return changed ? next : current;
        });
      }, 100);

      return function cleanup() {
        window.clearInterval(interval);
      };
    },
    [networkMode],
  );

  useEffect(
    function injectFailure() {
      if (!failNextArmed) {
        return;
      }

      const candidate = items.find(function findCandidate(item) {
        return item.status === "uploading" && item.progress >= 32;
      });

      if (!candidate) {
        return;
      }

      setItems(function failCandidate(current) {
        return current.map(function updateItem(item) {
          if (item.id !== candidate.id) {
            return item;
          }

          return {
            ...item,
            status: "failed",
            errorTitle: "Upload interrupted",
            errorMessage:
              "We couldn't finish uploading this file. You can retry without adding it again.",
          };
        });
      });

      onFailNextConsumed?.();
    },
    [failNextArmed, items, onFailNextConsumed],
  );

  useEffect(
    function announceStatusChanges() {
      const previous = previousStatusesRef.current;

      let announcement = "";

      for (const item of items) {
        const previousStatus = previous.get(item.id);

        if (previousStatus === item.status) {
          continue;
        }

        if (item.status === "processing") {
          announcement = `${item.file.name} finished uploading and is processing.`;
        }

        if (item.status === "ready") {
          announcement = `${item.file.name} is ready.`;
        }

        if (item.status === "failed") {
          announcement = `${item.file.name} failed to upload.`;
        }

        if (item.status === "paused") {
          announcement = `${item.file.name} upload paused because you are offline.`;
        }
      }

      previousStatusesRef.current = new Map(
        items.map(function mapStatus(item) {
          return [item.id, item.status];
        }),
      );

      if (announcement) {
        setLiveMessage(announcement);
      }
    },
    [items],
  );

  useEffect(
    function warnBeforeLeaving() {
      const hasActiveWork = items.some(function hasActive(item) {
        return (
          item.status === "queued" ||
          item.status === "uploading" ||
          item.status === "paused" ||
          item.status === "processing"
        );
      });

      if (!hasActiveWork) {
        return;
      }

      function handleBeforeUnload(event: BeforeUnloadEvent) {
        event.preventDefault();
        event.returnValue = "";
      }

      window.addEventListener("beforeunload", handleBeforeUnload);

      return function cleanup() {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    },
    [items],
  );

  useEffect(function cleanupTimers() {
    return function cleanup() {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
      }
    };
  }, []);

  const layoutTransition = reducedMotion
    ? {
        duration: 0,
      }
    : {
        type: "spring" as const,
        duration: 0.46,
        bounce: 0,
      };

  return (
    <>
      <motion.section
        layout={!reducedMotion}
        transition={layoutTransition}
        data-upload
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-labelledby="upload-title"
        aria-describedby="upload-constraints"
      >
        <input
          ref={inputRef}
          data-file-input
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleInputChange}
          aria-describedby="upload-constraints"
        />

        <header data-upload-header>
          <h2 id="upload-title" data-upload-title>
            Upload files
          </h2>

          {hasItems && (
            <button
              ref={addButtonRef}
              type="button"
              data-add-files
              onClick={openPicker}
              disabled={atLimit}
              aria-disabled={atLimit}
            >
              <span aria-hidden="true">+</span>
              Add files
            </button>
          )}
        </header>

        <AnimatePresence initial={false} mode="popLayout">
          {!hasItems && (
            <motion.div
              key="empty"
              layout={!reducedMotion}
              initial={
                reducedMotion
                  ? {
                      opacity: 0,
                    }
                  : {
                      opacity: 0,
                      y: 4,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={
                reducedMotion
                  ? {
                      opacity: 0,
                    }
                  : {
                      opacity: 0,
                      y: -4,
                    }
              }
              transition={
                reducedMotion
                  ? {
                      duration: 0.1,
                    }
                  : {
                      duration: 0.24,
                      ease: "easeOut",
                    }
              }
              data-empty-state
            >
              <EmptyUploadGlyph
                active={dragActive}
                reducedMotion={reducedMotion}
              />

              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={dragActive ? "drag" : "idle"}
                  data-empty-copy
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  transition={{
                    duration: reducedMotion ? 0.1 : 0.16,
                  }}
                >
                  <p data-empty-title>
                    {dragActive ? "Release to add files" : "Drop files here"}
                  </p>

                  {!dragActive && (
                    <p data-empty-secondary>
                      or{" "}
                      <button
                        ref={addButtonRef}
                        type="button"
                        data-choose-files
                        onClick={openPicker}
                      >
                        choose from your device
                      </button>
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>

              <p id="upload-constraints" data-upload-constraints>
                PDF, DOCX, PNG or JPG
                <span aria-hidden="true"> · </span>
                25 MB max
                <span aria-hidden="true"> · </span>5 files
              </p>
            </motion.div>
          )}

          {hasItems && (
            <motion.div
              key="queue"
              layout={!reducedMotion}
              initial={
                reducedMotion
                  ? {
                      opacity: 0,
                    }
                  : {
                      opacity: 0,
                      y: 5,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={
                reducedMotion
                  ? {
                      duration: 0.1,
                    }
                  : {
                      duration: 0.28,
                      ease: "easeOut",
                    }
              }
              data-upload-queue
            >
              <AnimatePresence initial={false}>
                {networkMode === "offline" && (
                  <motion.div
                    key="offline"
                    data-global-message
                    role="status"
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    transition={
                      reducedMotion
                        ? {
                            duration: 0.1,
                          }
                        : {
                            duration: 0.28,
                            ease: [0.22, 0.72, 0, 1],
                          }
                    }
                  >
                    You're offline. Uploads will resume when you're connected.
                  </motion.div>
                )}

                {networkMode !== "offline" && connectionMessage && (
                  <motion.div
                    key="online"
                    data-global-message
                    role="status"
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                  >
                    {connectionMessage}
                  </motion.div>
                )}

                {batchNotice && (
                  <motion.div
                    key={batchNotice.id}
                    data-global-message
                    role="status"
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                  >
                    <span>{batchNotice.message}</span>

                    <button
                      type="button"
                      data-dismiss-notice
                      onClick={function dismissNotice() {
                        setBatchNotice(null);
                      }}
                      aria-label="Dismiss message"
                    >
                      ×
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <ul data-file-list>
                <AnimatePresence initial={false} mode="popLayout">
                  {items.map(function renderItem(item) {
                    return (
                      <FileRow
                        key={item.id}
                        item={item}
                        highlighted={highlightedId === item.id}
                        reducedMotion={reducedMotion}
                        onCancel={cancelItem}
                        onRetry={retryItem}
                        onRemove={removeItem}
                        registerRow={registerRow}
                      />
                    );
                  })}
                </AnimatePresence>
              </ul>

              <footer data-upload-footer>
                <span data-summary>{summary}</span>

                <span id="upload-constraints" data-footer-constraints>
                  PDF, DOCX, PNG or JPG · 25 MB max
                </span>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {dragActive && hasItems && (
            <motion.div
              data-drop-overlay
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: reducedMotion ? 0.1 : 0.18,
              }}
              aria-hidden="true"
            >
              <EmptyUploadGlyph active reducedMotion={reducedMotion} />

              <span>Release to add files</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </div>
      </motion.section>

      <style>{`
        [data-upload] {
          position: relative;
          width: 100%;
          overflow: hidden;
          border:
            1px solid
            rgba(
              32,
              32,
              30,
              0.065
            );
          border-radius: 22px;
          color: #20201e;
          background: #f7f7f5;
          box-shadow:
            inset
              0 1px 0
              rgba(
                255,
                255,
                255,
                0.85
              ),
            0 1px 2px
              rgba(
                0,
                0,
                0,
                0.025
              ),
            0 18px 54px -42px
              rgba(
                0,
                0,
                0,
                0.32
              );
        }

        [data-file-input] {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(
            0,
            0,
            0,
            0
          );
          white-space: nowrap;
          border: 0;
        }

        [data-upload-header] {
          min-height: 59px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          border-bottom:
            1px solid
            rgba(
              32,
              32,
              30,
              0.06
            );
        }

        [data-upload-title] {
          margin: 0;
          color: #20201e;
          font-size: 14px;
          font-weight: 570;
          line-height: 1;
          letter-spacing:
            -0.015em;
        }

        [data-add-files] {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          padding: 0 10px;
          border:
            1px solid
            rgba(
              32,
              32,
              30,
              0.07
            );
          border-radius: 9px;
          color: #4f4f4b;
          background:
            rgba(
              255,
              255,
              255,
              0.64
            );
          box-shadow:
            0 1px 2px
              rgba(
                0,
                0,
                0,
                0.025
              );
          font-size: 11px;
          font-weight: 560;
          line-height: 1;
          cursor: pointer;
          touch-action:
            manipulation;
          transition:
            color 160ms ease,
            background-color
              160ms ease,
            transform 160ms
              cubic-bezier(
                0.2,
                0,
                0,
                1
              );
        }

        [data-add-files]
          span {
          margin-top: -1px;
          font-size: 14px;
          font-weight: 430;
        }

        [data-add-files]:hover:not(
            :disabled
          ) {
          color: #20201e;
          background: #ffffff;
        }

        [data-add-files]:active:not(
            :disabled
          ) {
          transform:
            scale(0.97);
        }

        [data-add-files]:disabled {
          color: #999994;
          cursor: not-allowed;
          opacity: 0.65;
        }

        [data-add-files]:focus-visible,
        [data-choose-files]:focus-visible,
        [data-file-action]:focus-visible,
        [data-dismiss-notice]:focus-visible {
          outline:
            2px solid
            #20201e;
          outline-offset: 2px;
        }

        [data-empty-state] {
          min-height: 330px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px 38px;
          text-align: center;
        }

        [data-empty-glyph] {
          width: 48px;
          height: 48px;
          color: #444440;
          overflow: visible;
        }

        [data-empty-copy] {
          margin-top: 20px;
        }

        [data-empty-title] {
          margin: 0;
          color: #2b2b29;
          font-size: 15px;
          font-weight: 570;
          letter-spacing:
            -0.02em;
        }

        [data-empty-secondary] {
          margin: 8px 0 0;
          color: #73736e;
          font-size: 12px;
          line-height: 1.5;
        }

        [data-choose-files] {
          margin: 0;
          padding: 0;
          border: 0;
          color: #3b3b38;
          background: transparent;
          font: inherit;
          font-weight: 560;
          text-decoration-line:
            underline;
          text-decoration-color:
            rgba(
              59,
              59,
              56,
              0.28
            );
          text-underline-offset:
            3px;
          cursor: pointer;
        }

        [data-choose-files]:hover {
          text-decoration-color:
            currentColor;
        }

        [data-upload-constraints] {
          margin: 19px 0 0;
          color: #81817c;
          font-size: 10.5px;
          font-weight: 450;
          line-height: 1.5;
        }

        [data-upload-queue] {
          position: relative;
        }

        [data-global-message] {
          position: relative;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          overflow: hidden;
          padding: 10px 18px;
          border-bottom:
            1px solid
            rgba(
              32,
              32,
              30,
              0.055
            );
          color: #60605c;
          background:
            rgba(
              32,
              32,
              30,
              0.025
            );
          font-size: 11px;
          line-height: 1.5;
        }

        [data-dismiss-notice] {
          width: 28px;
          height: 28px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          margin: -5px -6px -5px 0;
          padding: 0;
          border: 0;
          border-radius: 7px;
          color: #71716d;
          background: transparent;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
        }

        [data-dismiss-notice]:hover {
          color: #20201e;
          background:
            rgba(
              32,
              32,
              30,
              0.04
            );
        }

        [data-file-list] {
          margin: 0;
          padding: 0 18px;
          list-style: none;
        }

        [data-file-row] {
          display: grid;
          grid-template-columns:
            28px minmax(
              0,
              1fr
            );
          gap: 12px;
          margin: 0 -6px;
          padding: 18px 6px;
          border-bottom:
            1px solid
            rgba(
              32,
              32,
              30,
              0.055
            );
          border-radius: 8px;
        }

        [data-file-row]:last-child {
          border-bottom: 0;
        }

        [data-file-icon] {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          color: #4e4e4a;
        }

        [data-file-row][data-error="true"]
          [data-file-icon],
        [data-file-row][data-error="true"]
          [data-file-status] {
          color: #9b332d;
        }

        [data-status-glyph] {
          width: 20px;
          height: 20px;
          overflow: visible;
        }

        [data-file-content] {
          min-width: 0;
        }

        [data-file-heading] {
          min-width: 0;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 14px;
        }

        [data-file-name] {
          min-width: 0;
          display: flex;
          align-items: baseline;
          color: #2a2a28;
          font-size: 13.5px;
          font-weight: 570;
          line-height: 1.35;
          letter-spacing:
            -0.012em;
        }

        [data-file-stem] {
          min-width: 0;
          overflow: hidden;
          text-overflow:
            ellipsis;
          white-space: nowrap;
        }

        [data-file-extension] {
          flex: 0 0 auto;
        }

        [data-file-size] {
          flex: 0 0 auto;
          color: #84847f;
          font-size: 10.5px;
          font-weight: 450;
          line-height: 1;
          white-space: nowrap;
        }

        [data-file-status-row] {
          min-height: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 4px;
        }

        [data-file-status] {
          color: #74746f;
          font-size: 11px;
          font-weight: 470;
          line-height: 1.4;
        }

        [data-file-actions] {
          min-height: 30px;
          display: flex;
          align-items: center;
          gap: 2px;
          margin-right: -7px;
        }

        [data-file-action] {
          min-width: 44px;
          min-height: 30px;
          margin: 0;
          padding: 0 7px;
          border: 0;
          border-radius: 7px;
          color: #686864;
          background: transparent;
          font-size: 10.5px;
          font-weight: 550;
          line-height: 1;
          cursor: pointer;
          touch-action:
            manipulation;
          transition:
            color 150ms ease,
            background-color
              150ms ease;
        }

        [data-file-action]:hover {
          color: #20201e;
          background:
            rgba(
              32,
              32,
              30,
              0.04
            );
        }

        [data-progress] {
          position: relative;
          height: 3px;
          margin-top: 4px;
          overflow: hidden;
          border-radius: 999px;
          background:
            rgba(
              32,
              32,
              30,
              0.075
            );
        }

        [data-progress]
          span {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            rgba(
              32,
              32,
              30,
              0.76
            );
          transform-origin:
            left center;
        }

        [data-error-message] {
          max-width: 390px;
          margin: 5px 0 0;
          color: #74746f;
          font-size: 10.75px;
          line-height: 1.55;
        }

        [data-upload-footer] {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 11px 18px;
          border-top:
            1px solid
            rgba(
              32,
              32,
              30,
              0.055
            );
        }

        [data-summary] {
          color: #5f5f5b;
          font-size: 10.5px;
          font-weight: 540;
        }

        [data-footer-constraints] {
          color: #8a8a85;
          font-size: 9.5px;
          font-weight: 450;
        }

        [data-drop-overlay] {
          position: absolute;
          z-index: 5;
          inset: 59px 0 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #3e3e3a;
          background:
            rgba(
              247,
              247,
              245,
              0.93
            );
          backdrop-filter:
            blur(8px);
          -webkit-backdrop-filter:
            blur(8px);
          font-size: 13px;
          font-weight: 560;
          letter-spacing:
            -0.01em;
        }

        [data-drop-overlay]
          [data-empty-glyph] {
          width: 42px;
          height: 42px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(
            0,
            0,
            0,
            0
          );
          white-space: nowrap;
          border: 0;
        }

        @media (
          max-width: 520px
        ) {
          [data-upload] {
            border-radius: 16px;
          }

          [data-upload-header] {
            padding-inline: 16px;
          }

          [data-empty-state] {
            min-height: 300px;
            padding-inline: 16px;
          }

          [data-file-list] {
            padding-inline: 16px;
          }

          [data-file-row] {
            grid-template-columns:
              26px
              minmax(
                0,
                1fr
              );
            gap: 10px;
            padding-block: 16px;
          }

          [data-file-heading] {
            align-items: flex-start;
          }

          [data-file-status-row] {
            align-items: flex-start;
          }

          [data-file-actions] {
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          [data-upload-footer] {
            align-items: flex-start;
            padding-inline: 16px;
          }

          [data-footer-constraints] {
            max-width: 135px;
            text-align: right;
            line-height: 1.4;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          [data-add-files] {
            transition:
              color 160ms ease,
              background-color
                160ms ease;
          }

          [data-add-files]:active {
            transform: none;
          }
        }

        @media (
          forced-colors:
            active
        ) {
          [data-upload],
          [data-add-files] {
            border:
              1px solid
              ButtonText;
          }

          [data-progress] {
            border:
              1px solid
              ButtonText;
          }

          [data-progress]
            span {
            background:
              Highlight;
          }
        }
      `}</style>
    </>
  );
}
