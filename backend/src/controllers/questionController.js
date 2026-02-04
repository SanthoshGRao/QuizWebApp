import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
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

let ensuredBucket = false;
async function ensureStorageBucket() {
  if (ensuredBucket) return;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    const exists = (buckets || []).some((b) => b.name === env.supabaseStorageBucket);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(env.supabaseStorageBucket, {
        public: true,
      });
      if (createErr) throw createErr;
    }
    ensuredBucket = true;
  } catch {
    // If we can't ensure bucket (permissions/policy), uploads will fail with a clearer error later.
  }
}

function extFromFile(file) {
  const fromName = (file?.originalname || '').toLowerCase();
  const idx = fromName.lastIndexOf('.');
  if (idx >= 0 && idx < fromName.length - 1) return fromName.slice(idx);
  const mime = (file?.mimetype || '').toLowerCase();
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  return '.jpg';
}

async function uploadQuestionImage({ file, quizId }) {
  if (!file?.buffer) return null;
  await ensureStorageBucket();
  const objectPath = `${quizId}/${uuidv4()}${extFromFile(file)}`;
  const { error: upErr } = await supabase.storage.from(env.supabaseStorageBucket).upload(
    objectPath,
    file.buffer,
    {
      contentType: file.mimetype || 'image/jpeg',
      upsert: true,
    },
  );
  if (upErr) throw upErr;
  const { data } = supabase.storage.from(env.supabaseStorageBucket).getPublicUrl(objectPath);
  return data?.publicUrl || null;
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
    } = req.body;

    if ((question_text ?? '').toString().trim().length === 0) {
      return res.status(400).json({ message: 'Question text is required.' });
    }
    if (type === 'comprehension' && (paragraph ?? '').toString().trim().length === 0) {
      return res.status(400).json({ message: 'Paragraph is required for comprehension questions.' });
    }

    const validationError = validateOptions({ option1, option2, option3, option4 });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const uploadedUrl = req.file ? await uploadQuestionImage({ file: req.file, quizId }) : null;
    const record = {
      id: uuidv4(),
      quiz_id: quizId,
      question_text,
      type,
      paragraph: paragraph || null,
      option1,
      option2,
      option3,
      option4,
      correct_option,
      image_url: uploadedUrl,
      media_url: uploadedUrl,
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

    if (req.file) {
      // quizId is used only for object path grouping; it does not affect public URL.
      const uploadedUrl = await uploadQuestionImage({ file: req.file, quizId: 'questions' });
      update.image_url = uploadedUrl;
      update.media_url = uploadedUrl;
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

