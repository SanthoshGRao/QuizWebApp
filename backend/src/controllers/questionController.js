import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { createLog } from './logController.js';

function validateOptions(options) {
  const values = [options.option1, options.option2, options.option3, options.option4].map((o) =>
    (o ?? '').toString().trim(),
  );
  if (!values.every((v) => v.length > 0)) {
    return 'All four options are required and must be non-empty.';
  }
  return null;
}


export async function createQuestion(req, res, next) {
  try {
    const { quizId } = req.params;
    const {
      question_text,
      type,
      paragraph,
      option1,
      option2,
      option3,
      option4,
      correct_option,
      latex,
      explanation,
      image_url,
    } = req.body;

    const stem = (question_text ?? '').toString().trim();
    if (!stem.length) {
      return res.status(400).json({ message: 'Question text is required.' });
    }
    if (type === 'comprehension' && (paragraph ?? '').toString().trim().length === 0) {
      return res.status(400).json({ message: 'Paragraph is required for comprehension questions.' });
    }

    const opt1 = (option1 ?? '').toString().trim();
    const opt2 = (option2 ?? '').toString().trim();
    const opt3 = (option3 ?? '').toString().trim();
    const opt4 = (option4 ?? '').toString().trim();

    const validationError = validateOptions({ option1: opt1, option2: opt2, option3: opt3, option4: opt4 });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Prevent duplicates within the same quiz (same question text + options)
    const { data: existing, error: dupErr } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', quizId)
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

    const imageUrl = image_url || null;
    const record = {
      id: uuidv4(),
      quiz_id: quizId,
      question_text: stem,
      type,
      paragraph: paragraph || null,
      option1: opt1,
      option2: opt2,
      option3: opt3,
      option4: opt4,
      correct_option,
      image_url: imageUrl,
      media_url: imageUrl,
      latex,
      explanation,
    };

    const { data, error } = await supabase.from('questions').insert([record]).select().single();
    if (error) throw error;

    await createLog({
      userId: req.user.id,
      action: `Question created for quiz ${quizId}`,
      status: 'success',
      ip: req.ip,
      actionType: 'question_create',
      entityId: data.id,
    });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const update = { ...req.body };

    // If image_url is provided, use it (frontend uploads directly to Supabase Storage)
    if ('image_url' in update) {
      update.media_url = update.image_url;
    }

    if ('question_text' in update && (update.question_text ?? '').toString().trim().length === 0) {
      return res.status(400).json({ message: 'Question text is required.' });
    }
    if (
      ('type' in update || 'paragraph' in update) &&
      String(update.type || '').toLowerCase() === 'comprehension' &&
      (update.paragraph ?? '').toString().trim().length === 0
    ) {
      return res.status(400).json({ message: 'Paragraph is required for comprehension questions.' });
    }

    const hasAnyOptionField =
      'option1' in update || 'option2' in update || 'option3' in update || 'option4' in update;

    if (hasAnyOptionField) {
      // Ensure we always validate full set of options on update
      const existingRes = await supabase
        .from('questions')
        .select('option1, option2, option3, option4')
        .eq('id', id)
        .maybeSingle();
      if (existingRes.error) throw existingRes.error;
      const merged = {
        option1: update.option1 ?? existingRes.data.option1,
        option2: update.option2 ?? existingRes.data.option2,
        option3: update.option3 ?? existingRes.data.option3,
        option4: update.option4 ?? existingRes.data.option4,
      };
      const validationError = validateOptions(merged);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
    }

    const { data, error } = await supabase
      .from('questions')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await createLog({
      userId: req.user.id,
      action: `Question updated (${id})`,
      status: 'success',
      ip: req.ip,
      actionType: 'question_update',
      entityId: id,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;

    await createLog({
      userId: req.user.id,
      action: `Question deleted (${id})`,
      status: 'success',
      ip: req.ip,
      actionType: 'question_delete',
      entityId: id,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

