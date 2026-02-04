/**
 * Leaderboard controller - rank by score, tie-break by submission time
 * Class-wise and per-quiz leaderboards
 */
import { supabase } from '../config/supabase.js';

/** GET /leaderboard/classes - List classes for filter dropdown */
export async function getLeaderboardClasses(req, res, next) {
  try {
    const { role, class: userClass } = req.user;
    if (role === 'admin') {
      const { data } = await supabase.from('users').select('class').eq('role', 'student').not('class', 'is', null);
      const classes = [...new Set((data || []).map((r) => r.class).filter(Boolean))].sort();
      return res.json({ classes });
    }
    res.json({ classes: userClass ? [userClass] : [] });
  } catch (err) {
    next(err);
  }
}

/** GET /leaderboard/quizzes - List quizzes for filter dropdown */
export async function getLeaderboardQuizzes(req, res, next) {
  try {
    const { role, class: userClass } = req.user;
    if (role === 'admin') {
      const { data, error } = await supabase.from('quizzes').select('id, title').order('start_time', { ascending: false });
      if (error) throw error;
      return res.json({ quizzes: data || [] });
    }
    const { data: results } = await supabase.from('results').select('quiz_id').eq('user_id', req.user.id);
    const ids = [...new Set((results || []).map((r) => r.quiz_id))];
    if (!ids.length) return res.json({ quizzes: [] });
    const { data } = await supabase.from('quizzes').select('id, title').in('id', ids);
    res.json({ quizzes: data || [] });
  } catch (err) {
    next(err);
  }
}

/** GET /leaderboard?quizId=&class= - Leaderboard for quiz and/or class */
export async function getLeaderboard(req, res, next) {
  try {
    const { quizId, className } = req.query;
    const { role, class: userClass } = req.user;

    if (!quizId && !className) {
      return res.status(400).json({ message: 'Provide quizId or class' });
    }

    let query = supabase.from('results').select('id, user_id, quiz_id, score, total, submitted_at');
    if (quizId) query = query.eq('quiz_id', quizId);
    const { data: results, error } = await query;
    if (error) throw error;

    const userIds = [...new Set((results || []).map((r) => r.user_id))];
    const { data: users } = await supabase.from('users').select('id, name, class').in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);
    const userMap = new Map((users || []).map((u) => [u.id, u]));

    let filtered = (results || []).map((r) => ({
      ...r,
      user: userMap.get(r.user_id),
    }));
    if (className) filtered = filtered.filter((r) => r.user?.class === className);

    filtered.sort((a, b) => {
      const scoreA = a.total ? a.score / a.total : 0;
      const scoreB = b.total ? b.score / b.total : 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const timeA = new Date(a.submitted_at || a.id || 0).getTime();
      const timeB = new Date(b.submitted_at || b.id || 0).getTime();
      return timeA - timeB;
    });

    const ranked = filtered.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      name: r.user?.name,
      class: r.user?.class,
      score: r.score,
      total: r.total,
      percentage: r.total ? Math.round((r.score / r.total) * 100) : 0,
      submittedAt: r.submitted_at,
    }));

    if (role === 'student' && className && className !== userClass) {
      return res.status(403).json({ message: 'Cannot view other class leaderboard' });
    }

    res.json({ leaderboard: ranked });
  } catch (err) {
    next(err);
  }
}

/** GET /leaderboard/export - Export leaderboard as CSV (admin) */
export async function exportLeaderboard(req, res, next) {
  try {
    const { quizId, className } = req.query;
    if (!quizId && !className) return res.status(400).json({ message: 'Provide quizId or class' });
    let query = supabase.from('results').select('user_id, quiz_id, score, total, submitted_at');
    if (quizId) query = query.eq('quiz_id', quizId);
    const { data: results, error } = await query;
    if (error) throw error;
    const userIds = [...new Set((results || []).map((r) => r.user_id))];
    const { data: users } = await supabase.from('users').select('id, name, class').in('id', userIds.length ? userIds : ['']);
    const userMap = new Map((users || []).map((u) => [u.id, u]));
    let filtered = (results || []).map((r) => ({ ...r, user: userMap.get(r.user_id) }));
    if (className) filtered = filtered.filter((r) => r.user?.class === className);
    filtered.sort((a, b) => {
      const sa = a.total ? a.score / a.total : 0;
      const sb = b.total ? b.score / b.total : 0;
      if (sb !== sa) return sb - sa;
      return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
    });
    const csv = [
      ['Rank', 'Name', 'Class', 'Score', 'Total', 'Percentage', 'Submitted'],
      ...filtered.map((r, i) => [
        i + 1,
        r.user?.name || '',
        r.user?.class || '',
        r.score,
        r.total,
        r.total ? Math.round((r.score / r.total) * 100) + '%' : '',
        r.submitted_at ? new Date(r.submitted_at).toISOString() : '',
      ]),
    ].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leaderboard_${quizId || className || 'export'}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
}
