/**
 * Analytics controller - topic performance, accuracy, progress, class comparison
 */
import { supabase } from '../config/supabase.js';

/** GET /analytics/student - Student analytics */
export async function getStudentAnalytics(req, res, next) {
  try {
    const userId = req.user.id;
    const { data: results } = await supabase.from('results').select('quiz_id, score, total').eq('user_id', userId);
    const quizIds = [...new Set((results || []).map((r) => r.quiz_id))];
    const { data: quizzes } = await supabase.from('quizzes').select('id, title').in('id', quizIds.length ? quizIds : ['00000000-0000-0000-0000-000000000000']);
    const quizMap = new Map((quizzes || []).map((q) => [q.id, q]));
    const progress = (results || []).map((r) => ({
      title: quizMap.get(r.quiz_id)?.title || 'Quiz',
      score: r.total ? Math.round((r.score / r.total) * 100) : 0,
      correct: r.score,
      total: r.total,
    }));
    const totalCorrect = (results || []).reduce((s, r) => s + (r.score || 0), 0);
    const totalQuestions = (results || []).reduce((s, r) => s + (r.total || 0), 0);
    const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    res.json({ progress, accuracy, totalQuizzes: (results || []).length });
  } catch (err) {
    next(err);
  }
}

/** GET /analytics/admin - Admin analytics */
export async function getAdminAnalytics(req, res, next) {
  try {
    const { data: results } = await supabase.from('results').select('quiz_id, score, total');
    const quizIds = [...new Set((results || []).map((r) => r.quiz_id))];
    const { data: quizzes } = await supabase.from('quizzes').select('id, title, class').in('id', quizIds.length ? quizIds : ['00000000-0000-0000-0000-000000000000']);
    const quizMap = new Map((quizzes || []).map((q) => [q.id, q]));
    const byQuiz = {};
    (results || []).forEach((r) => {
      const t = quizMap.get(r.quiz_id)?.title || r.quiz_id;
      if (!byQuiz[t]) byQuiz[t] = { total: 0, correct: 0, count: 0 };
      byQuiz[t].total += r.total || 0;
      byQuiz[t].correct += r.score || 0;
      byQuiz[t].count += 1;
    });
    const topicPerformance = Object.entries(byQuiz).map(([name, v]) => ({
      name,
      accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
      attempts: v.count,
    }));
    const totalCorrect = (results || []).reduce((s, r) => s + (r.score || 0), 0);
    const totalQuestions = (results || []).reduce((s, r) => s + (r.total || 0), 0);
    res.json({
      topicPerformance,
      overallAccuracy: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      totalSubmissions: (results || []).length,
    });
  } catch (err) {
    next(err);
  }
}
