import { supabase } from '../config/supabase.js';

/** GET /admin/students/:id/performance - student results + classmates who have not taken any quiz */
export async function getStudentPerformance(req, res, next) {
  try {
    const { id: studentId } = req.params;
    const { data: student, error: studentErr } = await supabase
      .from('users')
      .select('id, name, email, class')
      .eq('id', studentId)
      .eq('role', 'student')
      .maybeSingle();
    if (studentErr || !student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const { data: results, error: rErr } = await supabase
      .from('results')
      .select('id, quiz_id, score, total')
      .eq('user_id', studentId)
      .order('quiz_id');
    if (rErr) throw rErr;
    const quizIds = (results || []).map((r) => r.quiz_id);
    const { data: quizzes, error: qErr } = await supabase
      .from('quizzes')
      .select('id, title')
      .in('id', quizIds.length ? quizIds : ['00000000-0000-0000-0000-000000000000']);
    const quizMap = new Map((quizzes || []).map((q) => [q.id, q]));
    const performance = (results || []).map((r) => ({
      ...r,
      title: quizMap.get(r.quiz_id)?.title ?? 'Quiz',
    }));
    let notAttended = [];
    if (student.class) {
      const { data: classStudents, error: csErr } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'student')
        .eq('class', student.class);
      if (!csErr && classStudents?.length) {
        const { data: anyResults } = await supabase
          .from('results')
          .select('user_id');
        const attendedIds = new Set((anyResults || []).map((r) => r.user_id));
        notAttended = classStudents.filter((s) => !attendedIds.has(s.id));
      }
    }
    res.json({ student, performance, notAttended });
  } catch (err) {
    next(err);
  }
}

/** GET /admin/quizzes/:id/export - CSV class-wise results for Excel download */
export async function exportQuizResults(req, res, next) {
  try {
    const { id: quizId } = req.params;
    const { data: quiz, error: qErr } = await supabase
      .from('quizzes')
      .select('id, title, class')
      .eq('id', quizId)
      .maybeSingle();
    if (qErr || !quiz) return res.status(404).json({ message: 'Quiz not found' });
    const className = quiz.class || '';
    const { data: classStudents } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'student')
      .eq('class', className);
    const { data: results } = await supabase
      .from('results')
      .select('user_id, score, total')
      .eq('quiz_id', quizId);
    const resultByUser = new Map((results || []).map((r) => [r.user_id, r]));
    const rows = [
      ['Name', 'Email', 'Score', 'Total', 'Status'],
      ...(classStudents || []).map((s) => {
        const r = resultByUser.get(s.id);
        if (r) return [s.name, s.email, r.score, r.total, 'Attended'];
        return [s.name, s.email, '', '', 'Did not attend'];
      }),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${(quiz.title || 'quiz').replace(/[^a-z0-9_-]/gi, '_')}_${(className || 'class').replace(/[^a-z0-9_-]/gi, '_')}_results.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
}

export async function adminDashboard(req, res, next) {
  try {
    const nowIso = new Date().toISOString();
    const [
      { count: studentCount, error: sErr },
      { count: quizCount, error: qErr },
      { data: activeQuizzes, error: aErr },
      { count: bankCount, error: bErr },
      { data: classesData, error: cErr },
      { count: resultsCount, error: rErr },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('quizzes').select('*', { count: 'exact', head: true }),
      supabase.from('quizzes').select('id').eq('published', true).lte('start_time', nowIso).gte('end_time', nowIso),
      supabase.from('question_bank').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('class', { distinct: true }).not('class', 'is', null).eq('role', 'student'),
      supabase.from('results').select('*', { count: 'exact', head: true }),
    ]);
    if (sErr) throw sErr;
    if (qErr) throw qErr;
    if (aErr) throw aErr;
    if (bErr) throw bErr;
    if (cErr) throw cErr;
    if (rErr) throw rErr;

    const classes = Array.from(new Set((classesData || []).map((row) => row.class).filter(Boolean)));

    res.json({
      totalStudents: studentCount || 0,
      totalQuizzes: quizCount || 0,
      activeQuizzes: (activeQuizzes || []).length,
      totalBankQuestions: bankCount || 0,
      totalClasses: classes.length,
      classes,
      totalAttempts: resultsCount || 0,
    });
  } catch (err) {
    next(err);
  }
}

// Return distinct list of classes from users table for dropdowns
export async function listClasses(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('class', { distinct: true })
      .not('class', 'is', null)
      .order('class', { ascending: true });
    if (error) throw error;
    const classes = Array.from(new Set((data || []).map((row) => row.class).filter(Boolean)));
    res.json({ classes });
  } catch (err) {
    next(err);
  }
}

