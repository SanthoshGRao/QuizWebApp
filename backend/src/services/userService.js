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
export function toInitialPassword(firstname, middlename, lastname) {
  return [firstname, middlename, lastname]
    .filter(Boolean)
    .join('')
    .toLowerCase()
    .replace(/\s/g, '');
}

export async function createStudent({ firstname, middlename, lastname, email, className }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
  const name = toDisplayName(firstname, middlename, lastname);
  const password = toInitialPassword(firstname, middlename, lastname);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
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
  return data;
}

export async function createStudentsBulk(rows, { defaultPassword = '123456' } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { data: [], error: null };
  }

  const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

  const users = rows.map((r) => {
    const firstname = r.firstname;
    const middlename = r.middlename;
    const lastname = r.lastname;
    const email = typeof r.email === 'string' ? r.email.trim().toLowerCase() : r.email;
    const name = toDisplayName(firstname, middlename, lastname) || email;

    return {
      id: uuidv4(),
      name,
      firstname: firstname || null,
      middlename: middlename || null,
      lastname: lastname || null,
      email,
      password_hash: passwordHash,
      role: 'student',
      class: r.className,
      first_login: true,
    };
  });

  const { data, error } = await supabase.from('users').insert(users).select();
  if (error) throw error;
  return data;
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

