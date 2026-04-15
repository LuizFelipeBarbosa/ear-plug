"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, X } from "lucide-react";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";
import { cn } from "@/lib/utils";
import type {
  EventPoll,
  EventPollAnswer,
  EventPollQuestion,
} from "@ear-plug/shared/types";

interface EventPollPromptProps {
  isOpen: boolean;
  eventTitle: string;
  questions: EventPoll["questions"];
  initialSelectedAnswers?: EventPollAnswer[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (answers: EventPollAnswer[]) => Promise<unknown> | unknown;
}

function buildInitialAnswerState(
  questions: EventPollQuestion[],
  initialSelectedAnswers?: EventPollAnswer[],
): Record<string, string> {
  const answerByQuestionId = new Map<string, string>();
  initialSelectedAnswers?.forEach((answer) => {
    if (answer.questionId && answer.optionId) {
      answerByQuestionId.set(answer.questionId, answer.optionId);
    }
  });

  return Object.fromEntries(
    questions.map((question) => [question.id, answerByQuestionId.get(question.id) ?? ""]),
  );
}

export function EventPollPrompt({
  isOpen,
  eventTitle,
  questions,
  initialSelectedAnswers,
  isSubmitting = false,
  onClose,
  onSubmit,
}: EventPollPromptProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    () => buildInitialAnswerState(questions, initialSelectedAnswers),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError(null);
      return;
    }

    setSelectedAnswers(buildInitialAnswerState(questions, initialSelectedAnswers));
    setSubmitError(null);
  }, [initialSelectedAnswers, isOpen, questions]);

  const handleSubmit = async () => {
    const hasMissingAnswer = questions.some(
      (question) => !selectedAnswers[question.id],
    );
    if (hasMissingAnswer) {
      setSubmitError("Answer every question before saving, or come back later.");
      return;
    }

    setSubmitError(null);
    try {
      await onSubmit(
        questions.map((question) => ({
          questionId: question.id,
          optionId: selectedAnswers[question.id],
        })),
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save poll answers",
      );
    }
  };

  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isSubmitting}
      labelledBy="event-poll-title"
      panelClassName="sm:max-w-lg"
    >
      <div className="border-b border-border bg-card/95 px-4 pb-4 pt-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-band/30 bg-band/10 text-band">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold  tracking-[0.18em] text-muted-foreground">
                RSVP Poll
              </p>
              <h2
                id="event-poll-title"
                className="text-base font-bold text-foreground sm:text-lg"
              >
                {eventTitle}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Share your thoughts to help us create better events!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0 rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:border-band/30 hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 sm:pb-6">
        <div className="space-y-4">
          {questions.map((question, questionIndex) => (
            <div
              key={question.id}
              className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm"
            >
              <div className="mb-4">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
                  Question {questionIndex + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {question.question}
                </p>
              </div>
              <div className="space-y-2">
                {question.options.map((option) => {
                  const isSelected = selectedAnswers[question.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedAnswers((prev) => ({
                          ...prev,
                          [question.id]: option.id,
                        }));
                        setSubmitError(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                        isSelected
                          ? "border-band bg-band/10 text-foreground"
                          : "border-border bg-muted/50 text-muted-foreground hover:border-band/30 hover:text-foreground",
                      )}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border",
                          isSelected
                            ? "border-band bg-band text-white"
                            : "border-border bg-card",
                        )}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {submitError ? (
            <p className="text-xs text-red-500">{submitError}</p>
          ) : null}
        </div>
      </div>

      <div className="safe-area-inset-bottom border-t border-border bg-card/95 px-4 pb-6 pt-3 backdrop-blur-xl sm:pb-5">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-band py-3 font-medium text-white transition-colors hover:bg-band/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Answers"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
          >
            Answer later
          </button>
        </div>
      </div>
    </ResponsiveSheetModal>
  );
}
