/**
 * Notification controller - in-app notifications
 */
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';

/** GET /notifications - List user notifications */
export async function listNotifications(req, res, next) {
  try {
    const { unreadOnly } = req.query;
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (unreadOnly === 'true') query = query.eq('read', false);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ notifications: data || [] });
  } catch (err) {
    next(err);
  }
}

/** PATCH /notifications/:id/read - Mark as read */
export async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** PATCH /notifications/read-all - Mark all as read */
export async function markAllRead(req, res, next) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** Create notification (internal helper) */
export async function createNotification({ userId, title, message, type, entityId }) {
  try {
    await supabase.from('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      title,
      message: message || null,
      type: type || null,
      entity_id: entityId || null,
    });
  } catch {
    // Non-fatal
  }
}
