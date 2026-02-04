/**
 * Import/Export controller - Excel/CSV for questions and quizzes
 * Uses SheetJS (xlsx)
 */
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';

const QUESTION_COLUMNS = ['question_text', 'type', 'paragraph', 'option1', 'option2', 'option3', 'option4', 'correct_option', 'explanation', 'subject', 'topic', 'difficulty'];

/** POST /import/questions - Import questions from Excel/CSV */
export async function importQuestions(req, res, next) {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: 'File required' });
    const target = req.body.target || 'bank'; // 'bank' or quizId
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows.length) return res.status(400).json({ message: 'Empty file', added: 0, failed: [] });
    const headers = rows[0].map((h) => String(h || '').toLowerCase().trim());
    const data = rows.slice(1);
    const added = [];
    const failed = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const obj = {};
      headers.forEach((h, j) => { obj[h] = row[j] != null ? String(row[j]).trim() : ''; });
      const q = {
        question_text: obj.question_text || obj.question,
        type: (obj.type || 'text').toLowerCase(),
        paragraph: obj.paragraph || '',
        option1: obj.option1 || obj.option_1,
        option2: obj.option2 || obj.option_2,
        option3: obj.option3 || obj.option_3,
        option4: obj.option4 || obj.option_4,
        correct_option: obj.correct_option || obj.correct || 'option1',
        explanation: obj.explanation || '',
        subject: obj.subject || null,
        topic: obj.topic || null,
        difficulty: obj.difficulty || null,
      };
      const missing = [q.option1, q.option2, q.option3, q.option4].filter((o) => !o);
      if (!q.question_text) {
        failed.push({ row: i + 2, reason: 'Missing question text' });
        continue;
      }
      if (missing.length) {
        failed.push({ row: i + 2, reason: `Missing options: ${missing.length} required` });
        continue;
      }
      try {
        if (target === 'bank') {
          // Skip exact duplicates in the bank
          const { data: existing, error: dupErr } = await supabase
            .from('question_bank')
            .select('id')
            .eq('question_text', q.question_text)
            .eq('option1', q.option1)
            .eq('option2', q.option2)
            .eq('option3', q.option3)
            .eq('option4', q.option4)
            .maybeSingle();
          if (dupErr) throw dupErr;
          if (existing) {
            failed.push({ row: i + 2, reason: 'Duplicate question (already exists in bank)' });
            continue;
          }
          const { data: inserted, error } = await supabase
            .from('question_bank')
            .insert([
              {
                id: uuidv4(),
                ...q,
                created_by: req.user.id,
              },
            ])
            .select()
            .single();
          if (error) throw error;
          added.push(inserted);
        } else {
          // Skip exact duplicates within the target quiz
          const { data: existing, error: dupErr } = await supabase
            .from('questions')
            .select('id')
            .eq('quiz_id', target)
            .eq('question_text', q.question_text)
            .eq('option1', q.option1)
            .eq('option2', q.option2)
            .eq('option3', q.option3)
            .eq('option4', q.option4)
            .maybeSingle();
          if (dupErr) throw dupErr;
          if (existing) {
            failed.push({ row: i + 2, reason: 'Duplicate question (already exists in quiz)' });
            continue;
          }
          const { data: inserted, error } = await supabase
            .from('questions')
            .insert([
              {
                id: uuidv4(),
                quiz_id: target,
                ...q,
              },
            ])
            .select()
            .single();
          if (error) throw error;
          added.push(inserted);
        }
      } catch (e) {
        failed.push({ row: i + 2, reason: e.message || 'Insert failed' });
      }
    }
    res.json({ added: added.length, failed, total: data.length });
  } catch (err) {
    next(err);
  }
}

/** GET /export/quiz/:quizId - Export quiz with questions and answers */
export async function exportQuiz(req, res, next) {
  try {
    const { quizId } = req.params;
    const { data: quiz, error: qErr } = await supabase.from('quizzes').select('*').eq('id', quizId).maybeSingle();
    if (qErr || !quiz) return res.status(404).json({ message: 'Quiz not found' });
    const { data: questions, error: qsErr } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('id');
    if (qsErr) throw qsErr;
    const rows = [
      ['Question', 'Type', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct', 'Explanation'],
      ...(questions || []).map((q) => [
        q.question_text,
        q.type,
        q.option1,
        q.option2,
        q.option3,
        q.option4,
        q.correct_option,
        q.explanation || '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${(quiz.title || 'quiz').replace(/[^a-z0-9_-]/gi, '_')}_export.xlsx"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
}
