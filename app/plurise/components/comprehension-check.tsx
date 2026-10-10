import { ArrowLeft, ArrowRight, CircleAlert } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState, type FormEvent, type RefObject } from "react";
import styles from "../plurise.module.css";
import { ANSWER_LABELS, type Answer } from "../lib/instrumentation";
import { CONDITIONS, type Condition } from "../lib/scenario";
import { Brand } from "./marks";
import { SPRING } from "./motion";

const ANSWERS: Answer[] = ["developer", "agent", "unsure"];
const SCALE = [1, 2, 3, 4, 5];

export function ComprehensionCheck({
  headingRef,
  condition,
  answer,
  confidence,
  reducedMotion,
  onAnswer,
  onConfidence,
  onBack,
  onSubmit,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  condition: Condition;
  answer: Answer | null;
  // No default: a preselected midpoint would anchor the response.
  confidence: number | null;
  reducedMotion: boolean;
  onAnswer: (answer: Answer) => void;
  onConfidence: (confidence: number) => void;
  onBack: () => void;
  onSubmit: (answer: Answer, confidence: number) => void;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const answerRef = useRef<HTMLInputElement>(null);
  const confidenceRef = useRef<HTMLInputElement>(null);

  const answerError = showErrors && answer === null;
  const confidenceError = showErrors && confidence === null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (answer === null || confidence === null) {
      setShowErrors(true);
      (answer === null ? answerRef : confidenceRef).current?.focus();
      return;
    }

    onSubmit(answer, confidence);
  };

  return (
    <div className={styles.checkStage}>
      <motion.form
        className={styles.checkCard}
        onSubmit={handleSubmit}
        noValidate
        aria-labelledby="check-title"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <div className={styles.checkTop}>
          <Brand />
          <span className={styles.badge}>
            {CONDITIONS[condition].name} · Session check
          </span>
        </div>

        <div className={styles.checkBody}>
          <h1 id="check-title" ref={headingRef} tabIndex={-1} className={styles.checkTitle}>
            Two questions before the trace
          </h1>
          <p className={styles.checkLead}>
            Answer from what happened in the workspace. Responses stay in this tab.
          </p>

          <fieldset
            className={styles.question}
            aria-describedby={answerError ? "answer-error" : undefined}
            data-invalid={answerError || undefined}
          >
            <legend className={styles.questionLegend}>
              <span className={styles.questionNumber}>1</span>
              Who controlled when the AI-generated change entered the working file?
            </legend>
            <div className={styles.optionList}>
              {ANSWERS.map((option, index) => (
                <label key={option} className={styles.option}>
                  <input
                    ref={index === 0 ? answerRef : undefined}
                    type="radio"
                    name="manipulation"
                    value={option}
                    checked={answer === option}
                    onChange={() => onAnswer(option)}
                    className={styles.radio}
                  />
                  <span>{ANSWER_LABELS[option]}</span>
                </label>
              ))}
            </div>
            {answerError ? (
              <p id="answer-error" className={styles.fieldError} role="alert">
                <CircleAlert aria-hidden="true" />
                Choose who controlled when the change entered the file.
              </p>
            ) : null}
          </fieldset>

          <fieldset
            className={styles.question}
            aria-describedby={confidenceError ? "confidence-error" : "confidence-scale"}
            data-invalid={confidenceError || undefined}
          >
            <legend className={styles.questionLegend}>
              <span className={styles.questionNumber}>2</span>
              How confident are you that the current implementation fully satisfies the task?
            </legend>
            <div className={styles.scale}>
              {SCALE.map((value) => (
                <label key={value} className={styles.scaleOption}>
                  <input
                    ref={value === 1 ? confidenceRef : undefined}
                    type="radio"
                    name="confidence"
                    value={value}
                    checked={confidence === value}
                    onChange={() => onConfidence(value)}
                    className={styles.scaleInput}
                  />
                  <span className={styles.scaleValue}>{value}</span>
                  {value === 1 ? <span className={styles.srOnly}>, not confident</span> : null}
                  {value === 5 ? <span className={styles.srOnly}>, very confident</span> : null}
                </label>
              ))}
            </div>
            <p id="confidence-scale" className={styles.scaleEnds} aria-hidden="true">
              <span>Not confident</span>
              <span>Very confident</span>
            </p>
            {confidenceError ? (
              <p id="confidence-error" className={styles.fieldError} role="alert">
                <CircleAlert aria-hidden="true" />
                Choose a confidence rating from 1 to 5.
              </p>
            ) : null}
          </fieldset>
        </div>

        <div className={styles.checkActions}>
          <button type="button" className={styles.secondaryButton} onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Back to workspace
          </button>
          <button type="submit" className={styles.primaryButton}>
            View interaction trace
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </motion.form>
    </div>
  );
}
