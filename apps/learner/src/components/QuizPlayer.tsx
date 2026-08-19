import { useState } from 'react';
import { MessageSquare, Users, ClipboardCheck, HelpCircle } from 'lucide-react';
import { api } from '../lib/api';

export interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: string;
  points: number;
  scenarioContext?: string | null;
  mediaUrl?: string | null;
  interactionJson?: {
    characterName?: string;
    characterRole?: string;
    openingPrompt?: string;
  } | null;
  assignmentJson?: {
    instructions?: string;
    submissionType?: string;
    minWords?: number;
    autoPassOnSubmit?: boolean;
    rubric?: string;
  } | null;
  options: { id: string; optionText: string; feedback?: string | null }[];
}

const typeLabels: Record<string, { label: string; icon: typeof HelpCircle; color: string }> = {
  SINGLE_CHOICE: { label: 'Multiple Choice', icon: HelpCircle, color: 'bg-indigo-50 text-indigo-700' },
  MULTI_CHOICE: { label: 'Multiple Choice', icon: HelpCircle, color: 'bg-indigo-50 text-indigo-700' },
  SCENARIO: { label: 'Scenario', icon: MessageSquare, color: 'bg-violet-50 text-violet-700' },
  ROLE_PLAY: { label: 'Role-Play', icon: Users, color: 'bg-amber-50 text-amber-700' },
  HANDS_ON: { label: 'Hands-On', icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-700' },
};

export function QuizPlayer({
  questions,
  answers,
  onAnswer,
  enrollmentId,
  onAssignmentSubmitted,
}: {
  questions: QuizQuestion[];
  answers: Record<string, string | string[]>;
  onAnswer: (questionId: string, value: string | string[]) => void;
  enrollmentId: string;
  onAssignmentSubmitted?: () => void;
}) {
  const [rolePlayFeedback, setRolePlayFeedback] = useState<Record<string, string>>({});
  const [assignmentText, setAssignmentText] = useState<Record<string, string>>({});
  const [assignmentFiles, setAssignmentFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const submitAssignment = async (questionId: string) => {
    setSubmitting(questionId);
    try {
      const form = new FormData();
      form.append('enrollmentId', enrollmentId);
      form.append('questionId', questionId);
      if (assignmentText[questionId]) form.append('textAnswer', assignmentText[questionId]);
      if (assignmentFiles[questionId]) form.append('file', assignmentFiles[questionId]);
      await api.post('/api/v1/trainings/progress/assignment-submit', form);
      setSubmitted((prev) => ({ ...prev, [questionId]: true }));
      onAssignmentSubmitted?.();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const meta = typeLabels[q.questionType] ?? typeLabels.SINGLE_CHOICE;
        const Icon = meta.icon;

        return (
          <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${meta.color}`}>
                <Icon className="w-3 h-3" />
                {meta.label}
              </span>
              <span className="text-xs text-slate-400">Q{i + 1} · {q.points} pt{q.points !== 1 ? 's' : ''}</span>
            </div>

            {q.questionType === 'SCENARIO' && q.scenarioContext && (
              <div className="mb-3 p-3 bg-violet-50 border border-violet-100 rounded-lg text-sm text-violet-900">
                <p className="font-medium text-violet-700 text-xs mb-1">Scenario</p>
                {q.scenarioContext}
              </div>
            )}

            {q.questionType === 'ROLE_PLAY' && q.interactionJson && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-xs font-medium text-amber-700">
                  {q.interactionJson.characterName}
                  {q.interactionJson.characterRole && ` · ${q.interactionJson.characterRole}`}
                </p>
                {q.interactionJson.openingPrompt && (
                  <p className="text-sm text-amber-900 mt-1">{q.interactionJson.openingPrompt}</p>
                )}
              </div>
            )}

            <p className="font-medium text-slate-900">{q.questionText}</p>

            {q.questionType === 'HANDS_ON' ? (
              <div className="mt-3 space-y-3">
                {q.assignmentJson?.instructions && (
                  <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border">{q.assignmentJson.instructions}</p>
                )}
                {q.assignmentJson?.rubric && (
                  <p className="text-xs text-slate-500">Rubric: {q.assignmentJson.rubric}</p>
                )}
                {(q.assignmentJson?.submissionType === 'text' || q.assignmentJson?.submissionType === 'both' || !q.assignmentJson?.submissionType) && (
                  <textarea
                    className="input min-h-[100px] w-full"
                    placeholder={`Your response${q.assignmentJson?.minWords ? ` (min ${q.assignmentJson.minWords} words)` : ''}`}
                    value={assignmentText[q.id] ?? ''}
                    onChange={(e) => setAssignmentText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    disabled={submitted[q.id]}
                  />
                )}
                {(q.assignmentJson?.submissionType === 'file' || q.assignmentJson?.submissionType === 'both') && (
                  <input
                    type="file"
                    className="text-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAssignmentFiles((prev) => ({ ...prev, [q.id]: file }));
                    }}
                    disabled={submitted[q.id]}
                  />
                )}
                {submitted[q.id] ? (
                  <p className="text-sm text-emerald-600">Assignment submitted — awaiting review</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => submitAssignment(q.id)}
                    disabled={!!submitting}
                    className="btn-secondary text-sm"
                  >
                    {submitting === q.id ? 'Submitting...' : 'Submit Assignment'}
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.id;
                  const showFeedback = q.questionType === 'ROLE_PLAY' && selected && opt.feedback;
                  return (
                    <div key={opt.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onAnswer(q.id, opt.id);
                          if (q.questionType === 'ROLE_PLAY' && opt.feedback) {
                            setRolePlayFeedback((prev) => ({ ...prev, [q.id]: opt.feedback! }));
                          }
                        }}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                          selected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {opt.optionText}
                      </button>
                      {showFeedback && (
                        <p className="text-xs text-amber-700 mt-1 ml-1 italic">{opt.feedback}</p>
                      )}
                    </div>
                  );
                })}
                {rolePlayFeedback[q.id] && !q.options.find((o) => answers[q.id] === o.id)?.feedback && (
                  <p className="text-xs text-amber-700 italic">{rolePlayFeedback[q.id]}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
