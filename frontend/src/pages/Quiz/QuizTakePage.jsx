import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/Layout.jsx';
import { apiClient } from '../../api/client.js';
import { Spinner } from '../../components/Loading.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { BlockMath } from 'react-katex';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const clean = String(url).replace(/^\/+/, '');
  return `${API_ORIGIN}/${clean}`;
}

export default function QuizTakePage() {
  const { quizId } = useParams();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [triggerAutoSubmit, setTriggerAutoSubmit] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const quizRes = await apiClient.get(`/quizzes/${quizId}`);
        if (quizRes.data.attempted) {
          addToast('You have already taken this quiz.', 'info');
          navigate(`/result/${quizId}`, { replace: true });
          return;
        }
        setQuiz(quizRes.data.quiz);
        setQuestions(quizRes.data.questions);
        const startRes = await apiClient.post(`/quizzes/${quizId}/start`);
        setTimeLeft(startRes.data.timeLeftSeconds ?? 0);
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.attempted) {
          addToast('You have already taken this quiz.', 'info');
          navigate(`/result/${quizId}`, { replace: true });
          return;
        }
        addToast(err.response?.data?.message || 'Failed to load quiz', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, addToast, navigate]);

  // Full screen when quiz is active (not loading)
  useEffect(() => {
    if (loading || !quiz) return;
    const el = document.documentElement;
    const wasFullscreen = !!document.fullscreenElement;
    el.requestFullscreen?.()?.catch(() => {});
    return () => {
      if (!wasFullscreen && document.fullscreenElement === el) {
        document.exitFullscreen?.()?.catch(() => {});
      }
    };
  }, [loading, quiz]);

  useEffect(() => {
    // Anti-cheat basics
    const onContext = (e) => e.preventDefault();
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onBlur = () => {
      addToast('Tab switch detected', 'error');
    };
    window.addEventListener('contextmenu', onContext);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('contextmenu', onContext);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, [addToast]);

  useEffect(() => {
    if (!timeLeft) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setTriggerAutoSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timeLeft]);

  // When timer expires, submit current answers (avoids stale closure)
  useEffect(() => {
    if (!triggerAutoSubmit || !quizId || submitting) return;
    setTriggerAutoSubmit(false);
    const payload = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    let cancelled = false;
    setSubmitting(true);
    apiClient
      .post(`/quizzes/${quizId}/submit`, { answers: payload })
      .then((res) => {
        if (cancelled) return;
        addToast('Quiz auto-submitted', 'info');
        navigate(`/result/${quizId}`, { state: { result: res.data.result } });
      })
      .catch((err) => {
        if (cancelled) return;
        addToast(err.response?.data?.message || 'Submit failed', 'error');
      })
      .finally(() => {
        if (!cancelled) setSubmitting(false);
      });
    return () => { cancelled = true; };
  }, [triggerAutoSubmit, quizId, addToast, navigate]);

  const handleSelect = async (qid, optionKey) => {
    const next = { ...answers, [qid]: optionKey };
    setAnswers(next);
    try {
      await apiClient.post(`/quizzes/${quizId}/auto-save`, {
        questionId: qid,
        answer: optionKey,
      });
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
      const res = await apiClient.post(`/quizzes/${quizId}/submit`, { answers: payload });
      if (auto) {
        addToast('Quiz auto-submitted', 'info');
      } else {
        addToast('Quiz submitted', 'success');
      }
      navigate(`/result/${quizId}`, { state: { result: res.data.result } });
    } catch (err) {
      addToast('Submit failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-80">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  const current = questions[currentIdx];

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{quiz.title}</h1>
            <p className="text-xs text-slate-400">
              Question {currentIdx + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">
              Time left{' '}
              <span className="font-mono text-sm text-indigo-300">
                {minutes}:{seconds}
              </span>
            </div>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              {submitting ? <Spinner /> : 'Submit'}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div className="text-sm text-slate-100">
              {current.type === 'comprehension' ? (
                <div className="space-y-3">
                  {!!current.paragraph && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-200 whitespace-pre-wrap">
                      {current.paragraph}
                    </div>
                  )}
                  {!!current.question_text && <div>{current.question_text}</div>}
                  {!!current.latex && <BlockMath math={current.latex} />}
                  {!!current.image_url && (
                    <img
                      src={resolveMediaUrl(current.image_url)}
                      alt="Question"
                      className="max-h-64 rounded-xl border border-slate-800 object-contain"
                    />
                  )}
                </div>
              ) : current.type === 'math' && current.latex ? (
                <div className="space-y-2">
                  {!!current.question_text && <div>{current.question_text}</div>}
                  <BlockMath math={current.latex} />
                </div>
              ) : current.type === 'image' ? (
                <div className="space-y-3">
                  {!!current.question_text && <div>{current.question_text}</div>}
                  {!!current.image_url && (
                    <img
                      src={resolveMediaUrl(current.image_url)}
                      alt="Question"
                      className="max-h-64 rounded-xl border border-slate-800 object-contain"
                    />
                  )}
                </div>
              ) : (
                current.question_text
              )}
            </div>
            <div className="grid gap-2">
              {['option1', 'option2', 'option3', 'option4'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleSelect(current.id, key)}
                  className={`w-full text-left rounded-xl border px-3 py-2 text-xs transition ${
                    answers[current.id] === key
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  {current[key]}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                disabled={currentIdx === questions.length - 1}
                className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
          </div>
          <div className="card p-4 text-xs">
            <div className="font-medium text-slate-100 mb-3">Question navigator</div>
            <div className="flex flex-wrap justify-center items-center gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  title={answers[q.id] ? 'Answered' : 'Not answered'}
                  className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium border transition flex items-center justify-center ${
                    idx === currentIdx
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                      : answers[q.id]
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

