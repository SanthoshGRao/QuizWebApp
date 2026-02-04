import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';

const SALT_ROUNDS = 10;

export async function findUserByEmail(email) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : email;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', normalized)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findUserById(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Build display name from first, optional middle, last. */
function toDisplayName(firstname, middlename, lastname) {
  return [firstname, middlename, lastname].filter(Boolean).join(' ').trim();
}

/** Initial password: lowercase, no spaces, firstname + middlename + lastname */
export function generateInitialPassword(firstname, middlename, lastname) {
  return [firstname, middlename, lastname]
    .filter(Boolean)
    .join('')
    .toLowerCase()
    .replace(/\s/g, '');
}

// Backwards-compatible alias
export const toInitialPassword = generateInitialPassword;

export async function createStudent({ firstname, middlename, lastname, email, className }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
  const name = toDisplayName(firstname, middlename, lastname);
  const initialPassword = generateInitialPassword(firstname, middlename, lastname);
  const passwordHash = await bcrypt.hash(initialPassword, SALT_ROUNDS);
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: uuidv4(),
        name,
        firstname: firstname || null,
        middlename: middlename || null,
        lastname: lastname || null,
        email: normalizedEmail,
        password_hash: passwordHash,
        role: 'student',
        class: className,
        first_login: true,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  // Do not persist initial password, but return it so callers (e.g. email) can use it
  return { ...data, _initialPassword: initialPassword };
}

export async function createStudentsBulk(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { inserted: [], skipped: [], failed: [] };
  }

  // Normalize emails and figure out which ones already exist
  const emailMap = new Map(); // normalizedEmail -> source row
  const emails = [];
  for (const r of rows) {
    const rawEmail = typeof r.email === 'string' ? r.email.trim().toLowerCase() : r.email;
    if (!rawEmail || emailMap.has(rawEmail)) continue;
    emailMap.set(rawEmail, r);
    emails.push(rawEmail);
  }

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('email')
    .in('email', emails);
  if (existingError) throw existingError;

  const existingSet = new Set((existing || []).map((u) => (u.email || '').trim().toLowerCase()));

  const toInsert = [];
  const skipped = [];

  for (const r of rows) {
    const firstname = r.firstname;
    const middlename = r.middlename;
    const lastname = r.lastname;
    const rawEmail = typeof r.email === 'string' ? r.email.trim().toLowerCase() : r.email;
    const name = toDisplayName(firstname, middlename, lastname) || rawEmail;

    if (!rawEmail || existingSet.has(rawEmail)) {
      skipped.push({
        email: rawEmail,
        name,
        reason: 'Email already exists',
      });
      continue;
    }

    const initialPassword = generateInitialPassword(firstname, middlename, lastname);
    const passwordHash = await bcrypt.hash(initialPassword, SALT_ROUNDS);

    toInsert.push({
      id: uuidv4(),
      name,
      firstname: firstname || null,
      middlename: middlename || null,
      lastname: lastname || null,
      email: rawEmail,
      password_hash: passwordHash,
      role: 'student',
      class: r.className,
      first_login: true,
      // Attach non-persisted password so caller can email it
      _initialPassword: initialPassword,
    });
  }

  if (!toInsert.length) {
    return { inserted: [], skipped, failed: [] };
  }

  const { data, error } = await supabase.from('users').insert(toInsert).select();
  if (error) {
    const reason = error.message || 'Bulk insert failed';
    const failed = toInsert.map((u) => ({
      email: u.email,
      name: u.name,
      reason,
    }));
    return { inserted: [], skipped, failed };
  }

  // Merge back non-persisted initial passwords onto returned rows (matched by email)
  const initialByEmail = new Map(
    toInsert.map((u) => [u.email, u._initialPassword]),
  );
  const insertedWithPassword =
    (data || []).map((u) => ({
      ...u,
      _initialPassword: initialByEmail.get(u.email),
    })) ?? [];

  return { inserted: insertedWithPassword, skipped, failed: [] };
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function updatePassword(userId, newPassword, { clearFirstLogin = false } = {}) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const update = {
    password_hash: passwordHash,
  };
  if (clearFirstLogin) {
    update.first_login = false;
  }
  const { data, error } = await supabase.from('users').update(update).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

