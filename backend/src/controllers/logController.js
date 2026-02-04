import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';

// Centralised helper to write audit logs.
// Optional fields (actionType/entityId) are stored when provided to support richer filtering.
export async function createLog({ userId, action, status, ip, actionType, entityId }) {
  const { error } = await supabase.from('logs').insert([
    {
      id: uuidv4(),
      user_id: userId ?? null,
      action,
      status,
      ip,
      action_type: actionType ?? null,
      entity_id: entityId ?? null,
    },
  ]);
  if (error) console.error('Log error', error);
}

export async function listLogs(req, res, next) {
  try {
    const { from, to, status, userId, search, page = 1, limit = 20 } = req.query;

    let query = supabase.from('logs').select('*', { count: 'exact' }).order('created_at', {
      ascending: false,
    });

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    if (status) query = query.eq('status', status);
    if (userId) query = query.eq('user_id', userId);
    // Free-text search across action + IP for the search bar
    if (search) {
      query = query.or(`action.ilike.%${search}%,ip.ilike.%${search}%`);
    }

    const start = (page - 1) * limit;
    const end = start + Number(limit) - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data, total: count });
  } catch (err) {
    next(err);
  }
}

