import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { signToken } from '../utils/jwt.js';
import { findUserByEmail, findUserById, updatePassword, verifyPassword } from '../services/userService.js';
import { sendEmail } from '../services/emailService.js';
import { env } from '../config/env.js';
import { createLog } from './logController.js';
import { createNotification } from './notificationController.js';

export async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body;
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';
    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await findUserByEmail(trimmedEmail);
    if (!user) {
      console.log('[auth] Login failed: user not found', { email: trimmedEmail });
      await createLog({
        userId: null,
        action: `Login failed for ${trimmedEmail}`,
        status: 'failure',
        ip: req.ip,
        actionType: 'login',
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.password_hash) {
      console.log('[auth] User has no password_hash', { userId: user.id, email: trimmedEmail });
      await createLog({
        userId: user.id,
        action: 'Login failed (no password hash)',
        status: 'failure',
        ip: req.ip,
        actionType: 'login',
        entityId: user.id,
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isValid = await verifyPassword(trimmedPassword, user.password_hash);
    console.log('[auth] Password compare result', { email: trimmedEmail, isValid, hasPasswordHash: !!user.password_hash });
    if (!isValid) {
      await createLog({
        userId: user.id,
        action: 'Login failed (invalid password)',
        status: 'failure',
        ip: req.ip,
        actionType: 'login',
        entityId: user.id,
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const payload = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      class: user.class,
    };
    const token = signToken(payload, {
      expiresIn: rememberMe ? '30d' : env.jwtExpiresIn,
    });
    await createLog({
      userId: user.id,
      action: 'User logged in',
      status: 'success',
      ip: req.ip,
      actionType: 'login',
      entityId: user.id,
    });

    console.log('[auth] Login success', { userId: user.id, first_login: user.first_login });
    const baseResponse = {
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        class: user.class,
        first_login: user.first_login,
      },
    };

    if (user.first_login) {
      return res.json({
        ...baseResponse,
        requirePasswordReset: true,
        redirect: '/first-reset',
      });
    }

    return res.json(baseResponse);
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  try {
    const fullUser = await findUserById(req.user.id);
    if (!fullUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { password_hash, ...userWithoutHash } = fullUser;
    return res.json({ user: userWithoutHash });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
}

export async function firstTimeReset(req, res, next) {
  try {
    const userId = req.user.id;
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    const updated = await updatePassword(userId, newPassword, { clearFirstLogin: true });
    return res.json({ message: 'Password updated', first_login: updated.first_login });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      // Do not reveal existence
      return res.json({ message: 'If an account exists, reset email sent' });
    }
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const { error } = await supabase.from('password_resets').insert([
      {
        id: uuidv4(),
        user_id: user.id,
        token,
        expires_at: expiresAt,
        used: false,
      },
    ]);
    if (error) throw error;

    const resetLink = `${env.clientUrl}/reset-password?token=${token}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Quiz App Account',
        html: `<p>Hello ${user.name || user.email},</p><p>You requested a password reset.</p><p>Please reset your password here: <a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`,
      });
    } catch (emailErr) {
      // Log but do not block API response
      console.error('[auth] Failed to send forgot-password email', {
        userId: user.id,
        email: user.email,
        error: emailErr?.message || emailErr,
      });
    }
    await createLog({
      userId: user.id,
      action: 'Password reset requested',
      status: 'success',
      ip: req.ip,
      actionType: 'password_reset_request',
      entityId: user.id,
    });

    // Non-blocking in-app notification
    Promise.resolve().then(() =>
      createNotification({
        userId: user.id,
        title: 'Password reset requested',
        message: 'If this was not you, please contact your administrator immediately.',
        type: 'password_reset',
        entityId: user.id,
      }),
    );

    return res.json({ message: 'If an account exists, reset email sent' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    const { data: resetRecord, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .maybeSingle();
    if (error) throw error;
    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Token expired' });
    }

    await updatePassword(resetRecord.user_id, password, { clearFirstLogin: true });
    const { error: updateError } = await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetRecord.id);
    if (updateError) throw updateError;

    await createLog({
      userId: resetRecord.user_id,
      action: 'Password reset completed',
      status: 'success',
      ip: req.ip,
      actionType: 'password_reset',
      entityId: resetRecord.user_id,
    });

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

