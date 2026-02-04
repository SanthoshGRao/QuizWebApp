import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { encryptAnswer } from '../utils/crypto.js';
import { createLog } from './logController.js';
import { createNotification } from './notificationController.js';

/** Seeded random for reproducible shuffle per user+quiz */
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Fisher-Yates shuffle with optional seeded random */
function shuffleArray(arr, random = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle questions and option order per student; remap correct_option to new keys. Uses seed for reproducibility. */
export function shuffleQuestionsAndOptions(questions, userId, quizId) {
  const seed = hashString(`${userId}-${quizId}`);
  const random = seededRandom(seed);
  const shuffled = shuffleArray(questions, random);
  return shuffled.map((q) => {
    const optionKeys = ['option1', 'option2', 'option3', 'option4'];
    const options = optionKeys.map((k) => ({ key: k, value: q[k] || '' }));
    const shuffledOpts = shuffleArray(options, random);
    const newQ = { ...q };
    optionKeys.forEach((k, i) => {
      newQ[k] = shuffledOpts[i].value;
    });
    const oldCorrect = q.correct_option;
    const newIdx = shuffledOpts.findIndex((o) => o.key === oldCorrect);
    newQ.correct_option = optionKeys[newIdx] || 'option1';
    return newQ;
  });
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export async function createQuiz(req, res, next) {
  try {
    const { title, className, start_time, end_time, published } = req.body;
    const { data, error } = await supabase
      .from('quizzes')
      .insert([
        {
          id: uuidv4(),
          title,
          class: className,
          start_time,
          end_time,
          published: !!published,
        },
      ])
      .select()
      .single();
    if (error) throw error;

    await createLog({
      userId: req.user.id,
      action: `Quiz created: ${data.title}`,
      status: 'success',
      ip: req.ip,
      actionType: 'quiz_create',
      entityId: data.id,
    });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function publishQuizNow(req, res, next) {
  try {
    const { id } = req.params;
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const { data: quiz, error: fetchErr } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const { count, error: countErr } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', id);
    if (countErr) throw countErr;
    if (count === 0) {
      return res.status(400).json({ message: 'Quiz must have at least one question to be published.' });
    }

    const startTime = new Date(quiz.start_time);
    const endTime = new Date(quiz.end_time);
    const update = { published: true };
    if (startTime > now) update.start_time = now.toISOString();
    if (endTime <= now) update.end_time = oneHourLater.toISOString();

    const { data, error } = await supabase
      .from('quizzes')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await createLog({
      userId: req.user.id,
      action: `Quiz published now: ${data.title}`,
      status: 'success',
      ip: req.ip,
      actionType: 'quiz_publish_now',
      entityId: id,
    });

    const { data: students } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'student')
      .eq('class', data.class);
    for (const s of students || []) {
      // eslint-disable-next-line no-await-in-loop
      await createNotification({
        userId: s.id,
        title: 'New quiz available',
        message: `"${data.title}" is now live.`,
        type: 'quiz',
        entityId: id,
      });
    }

    // Notify all admins that a quiz was published
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    for (const admin of admins || []) {
      // eslint-disable-next-line no-await-in-loop
      await createNotification({
        userId: admin.id,
        title: 'Quiz published',
        message: `"${data.title}" was published for class ${data.class || '-'}.`,
        type: 'admin_action',
        entityId: id,
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const { title, className, start_time, end_time, published } = req.body;

    const update = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) update.title = title;
    if (className !== undefined) update.class = className;
    if (start_time !== undefined) update.start_time = start_time;
    if (end_time !== undefined) update.end_time = end_time;
    if (published !== undefined) update.published = !!published;

    const { data, error } = await supabase
      .from('quizzes')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await createLog({
      userId: req.user.id,
      action: `Quiz updated: ${data.title}`,
      status: 'success',
      ip: req.ip,
      actionType: 'quiz_update',
      entityId: data.id,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const now = new Date();
    const endTime = quiz.end_time ? new Date(quiz.end_time) : null;
    if (quiz.published && endTime && endTime > now) {
      return res
        .status(400)
        .json({ message: 'Active quizzes cannot be deleted. Unpublish or wait until ended.' });
    }

    const { error: delError } = await supabase.from('quizzes').delete().eq('id', id);
    if (delError) throw delError;

    await createLog({
      userId: req.user.id,
      action: `Quiz deleted: ${quiz.title}`,
      status: 'success',
      ip: req.ip,
      actionType: 'quiz_delete',
      entityId: id,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listQuizzes(req, res, next) {
  try {
    const { role, class: userClass } = req.user;
    const nowIso = new Date().toISOString();
    let query = supabase.from('quizzes').select('*').order('start_time', { ascending: true });
    if (role === 'student') {
      query = query
        .eq('class', userClass)
        .lte('start_time', nowIso)
        .gte('end_time', nowIso);
    }
    const { data: quizzes, error } = await query;
    if (error) throw error;
    if (role === 'student' && quizzes?.length) {
      const quizIds = quizzes.map((q) => q.id);
      const { data: myAttempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_id')
        .eq('user_id', req.user.id)
        .eq('submitted', true)
        .in('quiz_id', quizIds);
      const attemptedSet = new Set((myAttempts || []).map((a) => a.quiz_id));
      if (!attemptedSet.size) {
        const { data: myResults } = await supabase
          .from('results')
          .select('quiz_id')
          .eq('user_id', req.user.id)
          .in('quiz_id', quizIds);
        (myResults || []).forEach((r) => attemptedSet.add(r.quiz_id));
      }
      const withAttempted = quizzes.map((q) => ({ ...q, attempted: attemptedSet.has(q.id) }));
      return res.json(withAttempted);
    }
    if (role === 'admin' && quizzes?.length) {
      const quizIds = quizzes.map((q) => q.id);
      const { data: questionRows } = await supabase
        .from('questions')
        .select('quiz_id')
        .in('quiz_id', quizIds);
      const countByQuiz = (questionRows || []).reduce((acc, row) => {
        acc[row.quiz_id] = (acc[row.quiz_id] || 0) + 1;
        return acc;
      }, {});
      const withCount = quizzes.map((q) => ({ ...q, question_count: countByQuiz[q.id] ?? 0 }));
      return res.json(withCount);
    }
    res.json(quizzes);
  } catch (err) {
    next(err);
  }
}

export async function addQuestionsFromBank(req, res, next) {
  try {
    const { quizId } = req.params;
    const bankQuestionIds = Array.isArray(req.body.bankQuestionIds)
      ? req.body.bankQuestionIds
      : [];

    if (!quizId) {
      return res.status(400).json({ message: 'quizId is required' });
    }
    if (!bankQuestionIds.length) {
      return res.status(400).json({ message: 'No bank question IDs provided' });
    }

    const { data: bankQuestions, error: bankErr } = await supabase
      .from('question_bank')
      .select(
        'id, question_text, type, paragraph, option1, option2, option3, option4, correct_option, explanation, latex',
      )
      .in('id', bankQuestionIds);
    if (bankErr) throw bankErr;
    if (!bankQuestions || !bankQuestions.length) {
      return res.status(404).json({ message: 'No matching bank questions found' });
    }

    const rows = bankQuestions.map((q) => ({
      id: uuidv4(),
      quiz_id: quizId,
      question_text: q.question_text,
      type: q.type || 'text',
      paragraph: q.paragraph || null,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      correct_option: q.correct_option,
      explanation: q.explanation || null,
      latex: q.latex || null,
    }));

    const { data, error } = await supabase.from('questions').insert(rows).select();
    if (error) throw error;

    await createLog({
      userId: req.user.id,
      action: `Added ${rows.length} question(s) from bank to quiz`,
      status: 'success',
      ip: req.ip,
      actionType: 'quiz_add_from_bank',
      entityId: quizId,
    });

    return res.status(201).json({ added: rows.length, questions: data || [] });
  } catch (err) {
    return next(err);
  }
}

export async function getQuizDetail(req, res, next) {
  try {
    const { quizId } = req.params;
    const { role } = req.user;
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .maybeSingle();
    if (quizError) throw quizError;
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    let questionSelect = '*';
    let attempted = false;
    if (role === 'student') {
      questionSelect =
        'id, quiz_id, question_text, type, paragraph, option1, option2, option3, option4, image_url, latex';
      const { data: existingAttempt } = await supabase
        .from('quiz_attempts')
        .select('id, submitted')
        .eq('user_id', req.user.id)
        .eq('quiz_id', quizId)
        .maybeSingle();
      attempted = existingAttempt?.submitted === true;
      if (!attempted) {
        const { data: existingResult } = await supabase
          .from('results')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('quiz_id', quizId)
          .maybeSingle();
        attempted = !!existingResult;
      }
    }
    let { data: questions, error: qError } = await supabase
      .from('questions')
      .select(questionSelect)
      .eq('quiz_id', quizId)
      .order('id');
    if (qError) throw qError;

    // Shuffle questions and options for each student (per-student, reproducible)
    if (role === 'student' && questions?.length) {
      questions = shuffleQuestionsAndOptions(questions, req.user.id, quizId);
    }

    const payload = { quiz, questions };
    if (role === 'student') payload.attempted = attempted;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function submitQuiz(req, res, next) {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    // Allow empty answers (e.g. auto-submit on time-up with no answers) so attempt is still marked submitted

    const { data: existingAttempt } = await supabase
      .from('quiz_attempts')
      .select('id, submitted')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();
    if (existingAttempt?.submitted) {
      return res.status(403).json({ message: 'You have already taken this quiz.' });
    }

    let { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, correct_option, option1, option2, option3, option4')
      .eq('quiz_id', quizId);
    if (qError) throw qError;

    // Use same shuffle as student saw when loading quiz
    const correctMap = new Map(questions.map((q) => [q.id, q.correct_option]));
    let score = 0;
    const total = questions.length;
    const answerRows = answers.map((a) => {
      const correct = correctMap.get(a.questionId);
      if (String(correct) === String(a.answer)) {
        score += 1;
      }
      return {
        id: uuidv4(),
        user_id: userId,
        quiz_id: quizId,
        encrypted_answer: encryptAnswer(JSON.stringify(a)),
      };
    });

    if (answerRows.length > 0) {
      const { error: insertError } = await supabase.from('answers').insert(answerRows);
      if (insertError) throw insertError;
    }

    const { data: existing } = await supabase
      .from('results')
      .select('id')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();

    const submittedAt = new Date().toISOString();
    let result;
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('results')
        .update({ score, total, submitted_at: submittedAt })
        .eq('id', existing.id)
        .select()
        .single();
      if (updateError) throw updateError;
      result = updated;
    } else {
      const { data: inserted, error: insertResultError } = await supabase
        .from('results')
        .insert({
          id: uuidv4(),
          user_id: userId,
          quiz_id: quizId,
          score,
          total,
          submitted_at: submittedAt,
        })
        .select()
        .single();
      if (insertResultError) throw insertResultError;
      result = inserted;
    }

    await supabase
      .from('quiz_attempts')
      .update({ submitted: true })
      .eq('user_id', userId)
      .eq('quiz_id', quizId);

    await createLog({
      userId,
      action: `Quiz submitted (score ${score}/${total})`,
      status: 'success',
      ip: req.ip,
      actionType: 'quiz_submission',
      entityId: quizId,
    });

    await createNotification({
      userId,
      title: 'Quiz submitted',
      message: `Your result: ${score}/${total}. View your result.`,
      type: 'result',
      entityId: quizId,
    });

    // Notify admins of the submission in a best-effort way
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    for (const admin of admins || []) {
      // eslint-disable-next-line no-await-in-loop
      await createNotification({
        userId: admin.id,
        title: 'Quiz submitted',
        message: `A quiz was submitted (quiz ID: ${quizId}).`,
        type: 'admin_action',
        entityId: quizId,
      });
    }

    res.json({ result });
  } catch (err) {
    next(err);
  }
}

export async function autoSaveAnswer(req, res, next) {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;
    const { questionId, answer } = req.body;
    if (!questionId) {
      return res.status(400).json({ message: 'questionId is required' });
    }
    const payload = { questionId, answer };
    const { error } = await supabase.from('answers').upsert(
      {
        id: `${userId}-${quizId}-${questionId}`,
        user_id: userId,
        quiz_id: quizId,
        encrypted_answer: encryptAnswer(JSON.stringify(payload)),
      },
      {
        onConflict: 'id',
      },
    );
    if (error) throw error;
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
}

