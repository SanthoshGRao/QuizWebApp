/**
 * Question bank controller - centralized questions with tags, reuse, clone
 */
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';

/** GET /bank - List questions with filters */
export async function listBankQuestions(req, res, next) {
  try {
    const { subject, topic, difficulty, search } = req.query;
    let query = supabase.from('question_bank').select('*').order('created_at', { ascending: false });
    if (subject) query = query.eq('subject', subject);
    if (topic) query = query.eq('topic', topic);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (search) query = query.ilike('question_text', `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ questions: data || [] });
  } catch (err) {
    next(err);
  }
}

/** POST /bank - Create question in bank */
export async function createBankQuestion(req, res, next) {
  try {
    const {
      question_text,
      type,
      paragraph,
      option1,
      option2,
      option3,
      option4,
      correct_option,
      explanation,
      subject,
      topic,
      difficulty,
      tags,
    } = req.body;
    if (!question_text || !option1 || !option2 || !option3 || !option4 || !correct_option) {
      return res
        .status(400)
        .json({ message: 'question_text, all options, and correct_option required' });
    }

    // Prevent exact duplicates in the bank (same stem + options)
    const stem = String(question_text).trim();
    const opt1 = String(option1).trim();
    const opt2 = String(option2).trim();
    const opt3 = String(option3).trim();
    const opt4 = String(option4).trim();

    const { data: existing, error: dupErr } = await supabase
      .from('question_bank')
      .select('id')
      .eq('question_text', stem)
      .eq('option1', opt1)
      .eq('option2', opt2)
      .eq('option3', opt3)
      .eq('option4', opt4)
      .maybeSingle();
    if (dupErr) throw dupErr;
    if (existing) {
      return res.status(409).json({ message: 'This question already exists.' });
    }

    const record = {
      id: uuidv4(),
      question_text: stem,
      type: type || 'text',
      paragraph: paragraph || null,
      option1: opt1,
      option2: opt2,
      option3: opt3,
      option4: opt4,
      correct_option,
      explanation: explanation || null,
      subject: subject || null,
      topic: topic || null,
      difficulty: difficulty || null,
      tags: Array.isArray(tags) ? tags : null,
      created_by: req.user.id,
    };
    const { data, error } = await supabase.from('question_bank').insert([record]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

/** GET /bank/:id - Get single question */
export async function getBankQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('question_bank').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Question not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/** POST /bank/:id/clone - Clone to quiz */
export async function cloneToQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const { quizId } = req.body;
    if (!quizId) return res.status(400).json({ message: 'quizId required' });
    const { data: bankQ, error: fetchErr } = await supabase.from('question_bank').select('*').eq('id', id).maybeSingle();
    if (fetchErr || !bankQ) return res.status(404).json({ message: 'Question not found' });
    const { question_text, type, paragraph, option1, option2, option3, option4, correct_option, explanation, latex } = bankQ;
    const record = {
      id: uuidv4(),
      quiz_id: quizId,
      question_text,
      type: type || 'text',
      paragraph: paragraph || null,
      option1, option2, option3, option4,
      correct_option,
      explanation: explanation || null,
      latex: latex || null,
    };
    const { data, error } = await supabase.from('questions').insert([record]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}
