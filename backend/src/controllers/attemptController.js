/**
 * Quiz attempt controller - per-student timer, start/end, auto-submit
 * Persists start time in DB, prevents multiple attempts
 */
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';

/** POST /quizzes/:quizId/start - Start attempt, record start_time, return end_time */
export async function startAttempt(req, res, next) {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;

    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .select('id, start_time, end_time, duration_minutes')
      .eq('id', quizId)
      .maybeSingle();
    if (quizErr || !quiz) return res.status(404).json({ message: 'Quiz not found' });

    const now = new Date();
    const quizStart = new Date(quiz.start_time);
    const quizEnd = new Date(quiz.end_time);
    if (now < quizStart) return res.status(400).json({ message: 'Quiz has not started yet' });
    if (now > quizEnd) return res.status(400).json({ message: 'Quiz has ended' });

    const { data: existing } = await supabase
      .from('quiz_attempts')
      .select('id, start_time, end_time, submitted')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();

    if (existing?.submitted) {
      return res.status(403).json({ message: 'You have already submitted this quiz', attempted: true });
    }

    const durationMs = (quiz.duration_minutes || Math.round((quizEnd - quizStart) / 60000)) * 60 * 1000;
    const attemptEnd = new Date(Math.min(now.getTime() + durationMs, quizEnd.getTime()));

    if (existing) {
      const end = new Date(existing.end_time);
      const timeLeftSeconds = Math.max(0, Math.floor((end - now) / 1000));
      return res.json({ attempt: existing, timeLeftSeconds });
    }

    const { data: inserted, error } = await supabase
      .from('quiz_attempts')
      .insert({
        id: uuidv4(),
        user_id: userId,
        quiz_id: quizId,
        start_time: now.toISOString(),
        end_time: attemptEnd.toISOString(),
        submitted: false,
      })
      .select()
      .single();
    if (error) throw error;

    const timeLeftSeconds = Math.max(0, Math.floor((attemptEnd - now) / 1000));
    res.status(201).json({ attempt: inserted, timeLeftSeconds });
  } catch (err) {
    next(err);
  }
}

/** GET /quizzes/:quizId/attempt - Get current attempt (for resume after refresh) */
export async function getAttempt(req, res, next) {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;

    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .select('id, start_time, end_time, submitted')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();
    if (error) throw error;

    if (!attempt) return res.status(404).json({ message: 'No attempt found' });
    if (attempt.submitted) return res.status(403).json({ message: 'Already submitted', attempted: true });

    const now = new Date();
    const end = new Date(attempt.end_time);
    const timeLeftSeconds = Math.max(0, Math.floor((end - now) / 1000));
    res.json({ attempt, timeLeftSeconds });
  } catch (err) {
    next(err);
  }
}
