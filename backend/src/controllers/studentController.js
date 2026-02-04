import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { createStudent, createStudentsBulk, generateInitialPassword } from '../services/userService.js';
import { sendEmail } from '../services/emailService.js';
import { decryptAnswer } from '../utils/crypto.js';
import { shuffleQuestionsAndOptions } from './quizController.js';
import { createNotification } from './notificationController.js';

async function sendWelcomeEmail(user) {
  if (!user || !user.id || !user.email) return;

  const initialPassword = generateInitialPassword(user.firstname, user.middlename, user.lastname);
  const resetLink = `${env.clientUrl}/first-reset`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Your Quiz App Account',
      html: `<p>Hello ${user.name || user.email},</p>
<p>Your account has been created.</p>
<p>Initial password: <strong>${initialPassword}</strong></p>
<p>Please reset your password here: <a href="${resetLink}">${resetLink}</a></p>`,
    });
  } catch (err) {
    // Email failures must never break student creation
    console.error('[students] Failed to send welcome email', {
      userId: user.id,
      email: user.email,
      error: err?.message || err,
    });
  }
}

export async function addStudent(req, res, next) {
  const defaultResponse = {
    added: 0,
    addedStudents: [],
    skipped: [],
    failed: [],
  };
  let handled = false;
  try {
    const { firstname, middlename, lastname, email, className } = req.body;
    if (!firstname || !lastname || !email || !className) {
      handled = true;
      return res
        .status(400)
        .json({ message: 'First name, last name, email and class are required' });
    }
    const student = await createStudent({ firstname, middlename, lastname, email, className });
    // Fire-and-forget welcome email with initial password – do not block request lifecycle
    Promise.resolve().then(() => sendWelcomeEmail(student));
    // Non-blocking in-app notification for the new student and admins
    Promise.resolve().then(async () => {
      try {
        await createNotification({
          userId: student.id,
          title: 'Account created',
          message: 'Your QuizApp account has been created. Please reset your password before first use.',
          type: 'account',
          entityId: student.id,
        });
        // Notify all admins about the new student
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin');
        for (const admin of admins || []) {
          // best-effort; failures are swallowed inside createNotification
          // eslint-disable-next-line no-await-in-loop
          await createNotification({
            userId: admin.id,
            title: 'New student account created',
            message: `${student.name || student.email} (${className}) was added.`,
            type: 'admin_action',
            entityId: student.id,
          });
        }
      } catch {
        // Notifications must never break student creation
      }
    });

    handled = true;
    return res.status(201).json(student);
  } catch (err) {
    handled = true;
    return next(err);
  } finally {
    // Final safeguard so the request never hangs even if something above failed unexpectedly
    if (!handled && !res.headersSent) {
      res.status(200).json(defaultResponse);
    }
  }
}

export async function bulkUploadStudents(req, res, next) {
  const defaultResponse = {
    added: 0,
    addedStudents: [],
    skipped: [],
    failed: [],
  };
  let handled = false;
  try {
    if (!req.file || !req.file.buffer) {
      handled = true;
      return res.status(400).json({ message: 'CSV file is required' });
    }
    const content = req.file.buffer.toString('utf8');
    let records;
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (parseErr) {
      return res.status(400).json({
        message: 'Invalid CSV format',
        added: 0,
        failed: [{ email: '', name: '', reason: parseErr.message || 'Could not parse CSV' }],
      });
    }
    if (!Array.isArray(records)) records = [];
    const prepared = [];
    const failed = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const firstname = (r.firstname || r.first_name || r.FirstName || r['First Name'] || '').trim();
      const middlename = (r.middlename || r.middle_name || r.MiddleName || r['Middle Name'] || '').trim() || undefined;
      const lastname = (r.lastname || r.last_name || r.LastName || r['Last Name'] || '').trim();
      const email = (r.email || r.Email || '').trim();
      const className = (r.class || r.Class || '').trim();
      const name = [firstname, middlename, lastname].filter(Boolean).join(' ').trim() || email;

      if (!firstname || !lastname || !email || !className) {
        failed.push({
          email,
          name: name || email,
          reason: 'Missing required field (firstname, lastname, email, or class)',
        });
        continue;
      }

      prepared.push({ firstname, middlename, lastname, email, className });
    }

    let inserted = [];
    let skipped = [];
    let serviceFailed = [];
    if (prepared.length) {
      const bulkResult = await createStudentsBulk(prepared);
      inserted = bulkResult.inserted || [];
      skipped = bulkResult.skipped || [];
      serviceFailed = bulkResult.failed || [];
    }

    // Map service-level failures into failed entries
    for (const f of serviceFailed) {
      failed.push({
        email: f.email,
        name: f.name || f.email,
        reason: f.reason || 'Create failed',
      });
    }

    // Attempt to send welcome emails for successfully created students in a non-blocking way
    if (inserted.length) {
      // Fire-and-forget; Promise.allSettled ensures internal rejections are handled
      Promise.resolve().then(() =>
        Promise.allSettled(
          inserted.map(async (student) => {
            await sendWelcomeEmail(student);
            try {
              await createNotification({
                userId: student.id,
                title: 'Account created',
                message:
                  'Your QuizApp account has been created from a bulk upload. Please reset your password before first use.',
                type: 'account',
                entityId: student.id,
              });
            } catch {
              // ignore; non-fatal
            }
          }),
        ),
      );
      // Best-effort admin summary notification
      Promise.resolve().then(async () => {
        try {
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin');
          for (const admin of admins || []) {
            // eslint-disable-next-line no-await-in-loop
            await createNotification({
              userId: admin.id,
              title: 'Bulk students import completed',
              message: `${inserted.length} student(s) added, ${skipped.length} skipped, ${failed.length} failed.`,
              type: 'admin_action',
            });
          }
        } catch {
          // ignore
        }
      });
    }

    handled = true;
    return res.json({
      added: inserted.length,
      addedStudents: inserted,
      skipped,
      failed,
    });
  } catch (err) {
    handled = true;
    return next(err);
  } finally {
    // Final safeguard so the request never hangs even if something above failed unexpectedly
    if (!handled && !res.headersSent) {
      res.status(200).json(defaultResponse);
    }
  }
}

export async function getMyResults(req, res, next) {
  try {
    const userId = req.user.id;
    const { data: results, error } = await supabase
      .from('results')
      .select('id, quiz_id, score, total')
      .eq('user_id', userId);
    if (error) throw error;

    if (!results?.length) return res.json([]);

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, start_time')
      .in('id', results.map((r) => r.quiz_id));

    const quizMap = new Map((quizzes || []).map((q) => [q.id, q]));
    const enriched = results.map((r) => ({
      ...r,
      title: quizMap.get(r.quiz_id)?.title ?? 'Quiz',
      start_time: quizMap.get(r.quiz_id)?.start_time,
    }));
    enriched.sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
}

export async function getMyQuizResultDetail(req, res, next) {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;

    const { data: result, error: rErr } = await supabase
      .from('results')
      .select('id, quiz_id, score, total')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!result) return res.status(404).json({ message: 'Result not found' });

    const { data: quiz, error: qErr } = await supabase
      .from('quizzes')
      .select('id, title')
      .eq('id', quizId)
      .single();
    if (qErr || !quiz) return res.status(404).json({ message: 'Quiz not found' });

    let { data: questions, error: qsErr } = await supabase
      .from('questions')
      .select('id, question_text, type, paragraph, option1, option2, option3, option4, correct_option, explanation, image_url, latex')
      .eq('quiz_id', quizId)
      .order('id');
    if (qsErr) throw qsErr;

    // Apply same shuffle as when student took the quiz
    questions = shuffleQuestionsAndOptions(questions || [], userId, quizId);

    const { data: answerRows, error: aErr } = await supabase
      .from('answers')
      .select('id, encrypted_answer')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });
    if (aErr) throw aErr;

    const userAnswersMap = new Map();
    for (const row of answerRows || []) {
      try {
        const payload = JSON.parse(decryptAnswer(row.encrypted_answer));
        const qid = payload.questionId || payload.question_id;
        const ans = payload.answer;
        if (qid && !userAnswersMap.has(qid)) userAnswersMap.set(qid, ans);
      } catch {
        // skip bad decryption
      }
    }

    const breakdown = (questions || []).map((q) => {
      const userAnswer = userAnswersMap.get(q.id);
      const isCorrect = String(q.correct_option) === String(userAnswer);
      return {
        questionId: q.id,
        question_text: q.question_text,
        type: q.type,
        paragraph: q.paragraph,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        user_answer: userAnswer || null,
        isCorrect,
        explanation: q.explanation,
        image_url: q.image_url,
        latex: q.latex,
      };
    });

    res.json({
      result: { id: result.id, quiz_id: result.quiz_id, score: result.score, total: result.total },
      quiz: { id: quiz.id, title: quiz.title },
      breakdown,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('users')
      .select('id, name, firstname, middlename, lastname, email, class, role')
      .eq('id', userId)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Profile not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { firstname, middlename, lastname } = req.body;
    const parts = [firstname, middlename, lastname].filter((x) => x != null && x !== '');
    const name = parts.join(' ').trim() || req.user.name;
    const update = {
      firstname: firstname ?? null,
      middlename: middlename ?? null,
      lastname: lastname ?? null,
      name,
    };
    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listStudents(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10,
      className,
      name,
      email,
      search,
      class: classParam,
    } = req.query;

    const classFilter = classParam || className;

    let query = supabase.from('users').select('*', { count: 'exact' }).eq('role', 'student');

    if (classFilter) {
      query = query.eq('class', classFilter);
    }
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    // Generic search across name + email for the main search box
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + Number(limit) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data, total: count });
  } catch (err) {
    next(err);
  }
}

