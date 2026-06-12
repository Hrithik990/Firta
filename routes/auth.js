const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const supabase = require('../config/db');
const { guestOnly, requireAuth } = require('../middleware/auth');
const router   = express.Router();

async function trySendEmail(fn) {
  if (!process.env.EMAIL_USER) return;
  try { await fn(); } catch(e) { console.error('Email error:', e.message); }
}

// ── GET /login ──────────────────────────────────────────────
router.get('/login', guestOnly, (req, res) => res.render('login'));

// ── POST /login ─────────────────────────────────────────────
router.post('/login', guestOnly, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flashError('Email and password are required.');
    return res.redirect('/login');
  }
  try {
    const { data: users, error } = await supabase
      .from('users').select('*').eq('email', email.toLowerCase().trim()).limit(1);
    if (error) throw error;
    const user = users && users[0];
    if (!user) { req.flashError('No account found with that email.'); return res.redirect('/login'); }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) { req.flashError('Incorrect password.'); return res.redirect('/login'); }

    if (user.hasOwnProperty('is_verified') && user.is_verified === false) {
      req.flashError('Please verify your email first. Check your inbox.');
      return res.redirect('/login');
    }

    req.session.userId   = user.id;
    req.session.userName = user.full_name;
    req.session.userPlan = user.plan;

    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:sans-serif;display:grid;place-items:center;height:100vh;background:#f0f4f3;margin:0}.box{text-align:center;color:#0d9e82}p{margin-top:1rem;color:#666;font-size:14px}</style>
    </head><body><div class="box">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0d9e82" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
    <p>Signing you in...</p></div>
    <script>setTimeout(function(){window.location.href='/dashboard';},300);</script>
    </body></html>`);
  } catch (err) {
    console.error('Login error:', err.message);
    req.flashError('Login failed: ' + err.message);
    res.redirect('/login');
  }
});

// ── GET /signup ─────────────────────────────────────────────
router.get('/signup', guestOnly, (req, res) => res.render('signup'));

// ── POST /signup ────────────────────────────────────────────
router.post('/signup', guestOnly, async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  if (!fullName || !email || !password) {
    req.flashError('Name, email, and password are required.');
    return res.redirect('/signup');
  }
  if (password.length < 8) {
    req.flashError('Password must be at least 8 characters.');
    return res.redirect('/signup');
  }
  try {
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email.toLowerCase().trim()).limit(1);
    if (existing && existing.length > 0) {
      req.flashError('An account with that email already exists.');
      return res.redirect('/signup');
    }

    const hash    = await bcrypt.hash(password, 12);
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { error: insertErr } = await supabase.from('users').insert({
      full_name:            fullName,
      email:                email.toLowerCase().trim(),
      phone:                phone || null,
      password_hash:        hash,
      is_verified:          false,
      verify_token:         token,
      verify_token_expires: expires,
    });
    if (insertErr) throw insertErr;

    const { sendVerificationEmail } = require('../utils/email');
    await trySendEmail(() => sendVerificationEmail({ toEmail: email, fullName, token, host: req.get('host') }));

    res.render('verify-pending', { email, resent: false });
  } catch (err) {
    console.error('Signup error:', err.message);
    req.flashError('Could not create account: ' + err.message);
    res.redirect('/signup');
  }
});

// ── GET /verify-email ────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) { req.flashError('Invalid link.'); return res.redirect('/login'); }
  try {
    const { data: users } = await supabase
      .from('users').select('*').eq('verify_token', token).limit(1);
    const user = users && users[0];
    if (!user) { req.flashError('Invalid or used link.'); return res.redirect('/login'); }
    if (new Date(user.verify_token_expires) < new Date()) {
      req.flashError('Link expired. Sign up again.');
      return res.redirect('/signup');
    }
    await supabase.from('users').update({
      is_verified: true, verify_token: null, verify_token_expires: null,
    }).eq('id', user.id);

    req.session.flash_success = '✅ Email verified! You can now log in.';
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
    <script>window.location.href='/login';</script></body></html>`);
  } catch (err) {
    req.flashError('Verification failed: ' + err.message);
    res.redirect('/login');
  }
});

// ── POST /resend-verification ────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  try {
    const { data: users } = await supabase
      .from('users').select('*').eq('email', email.toLowerCase().trim()).limit(1);
    const user = users && users[0];
    if (user && !user.is_verified) {
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await supabase.from('users').update({ verify_token: token, verify_token_expires: expires }).eq('id', user.id);
      const { sendVerificationEmail } = require('../utils/email');
      await trySendEmail(() => sendVerificationEmail({ toEmail: user.email, fullName: user.full_name, token, host: req.get('host') }));
    }
    res.render('verify-pending', { email, resent: true });
  } catch (err) {
    res.redirect('/login');
  }
});

// ── GET /forgot-password ─────────────────────────────────────
router.get('/forgot-password', guestOnly, (req, res) => res.render('forgot-password'));

// ── POST /forgot-password ────────────────────────────────────
router.post('/forgot-password', guestOnly, async (req, res) => {
  const { email } = req.body;
  if (!email) { req.flashError('Please enter your email.'); return res.redirect('/forgot-password'); }
  try {
    const { data: users } = await supabase
      .from('users').select('*').eq('email', email.toLowerCase().trim()).limit(1);
    const user = users && users[0];
    if (user) {
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await supabase.from('users').update({ reset_token: token, reset_token_expires: expires }).eq('id', user.id);
      const { sendPasswordResetEmail } = require('../utils/email');
      await trySendEmail(() => sendPasswordResetEmail({ toEmail: user.email, fullName: user.full_name, token, host: req.get('host') }));
    }
    req.flashSuccess('If that email exists, a reset link has been sent.');
    res.redirect('/forgot-password');
  } catch (err) {
    req.flashError('Something went wrong: ' + err.message);
    res.redirect('/forgot-password');
  }
});

// ── GET /reset-password ──────────────────────────────────────
router.get('/reset-password', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/forgot-password');
  try {
    const { data: users } = await supabase
      .from('users').select('id,reset_token_expires').eq('reset_token', token).limit(1);
    const user = users && users[0];
    if (!user || new Date(user.reset_token_expires) < new Date()) {
      req.flashError('Reset link expired.');
      return res.redirect('/forgot-password');
    }
    res.render('reset-password', { token });
  } catch (err) {
    res.redirect('/forgot-password');
  }
});

// ── POST /reset-password ─────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token) return res.redirect('/forgot-password');
  if (!password || password.length < 8) {
    req.flashError('Password must be at least 8 characters.');
    return res.redirect(`/reset-password?token=${token}`);
  }
  if (password !== confirmPassword) {
    req.flashError('Passwords do not match.');
    return res.redirect(`/reset-password?token=${token}`);
  }
  try {
    const { data: users } = await supabase
      .from('users').select('*').eq('reset_token', token).limit(1);
    const user = users && users[0];
    if (!user || new Date(user.reset_token_expires) < new Date()) {
      req.flashError('Reset link expired.');
      return res.redirect('/forgot-password');
    }
    const hash = await bcrypt.hash(password, 12);
    await supabase.from('users').update({
      password_hash: hash, reset_token: null, reset_token_expires: null,
    }).eq('id', user.id);
    req.session.flash_success = '✅ Password reset! You can now log in.';
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
    <script>window.location.href='/login';</script></body></html>`);
  } catch (err) {
    req.flashError('Could not reset: ' + err.message);
    res.redirect('/forgot-password');
  }
});

// ── GET /settings ────────────────────────────────────────────
router.get('/settings', requireAuth, async (req, res) => {
  try {
    // Select only columns that definitely exist — bio is optional
    const { data: users, error } = await supabase
      .from('users')
      .select('full_name, email, phone')
      .eq('id', req.session.userId)
      .limit(1);

    if (error) throw error;

    const user = users && users[0];
    if (!user) { req.flashError('Could not load profile.'); return res.redirect('/dashboard'); }

    // Try to get bio separately (may not exist yet in DB)
    let bio = '';
    try {
      const { data: bioData } = await supabase
        .from('users').select('bio').eq('id', req.session.userId).limit(1);
      bio = (bioData && bioData[0] && bioData[0].bio) || '';
    } catch(e) { /* bio column may not exist yet */ }

    res.render('settings', {
      user:        { ...user, bio },
      sessionUser: { name: req.session.userName, plan: req.session.userPlan },
    });
  } catch (err) {
    console.error('Settings GET error:', err.message);
    // Render with empty data rather than crashing
    res.render('settings', {
      user:        { full_name: req.session.userName, email: '', phone: '', bio: '' },
      sessionUser: { name: req.session.userName, plan: req.session.userPlan },
    });
  }
});

// ── POST /settings ───────────────────────────────────────────
router.post('/settings', requireAuth, async (req, res) => {
  const htmlRedirect = (url) => res.send(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
    <script>window.location.href='${url}';</script></body></html>`
  );

  const type = req.body._type; // 'profile' or 'password'

  try {
    if (type === 'password') {
      // ── Password change only ──────────────────────────────
      const { currentPassword, newPassword, confirmNewPassword } = req.body;

      if (!currentPassword || !newPassword) {
        req.session.flash_error = 'Both current and new password are required.';
        return htmlRedirect('/settings');
      }
      if (newPassword.length < 8) {
        req.session.flash_error = 'New password must be at least 8 characters.';
        return htmlRedirect('/settings');
      }
      if (confirmNewPassword && newPassword !== confirmNewPassword) {
        req.session.flash_error = 'New passwords do not match.';
        return htmlRedirect('/settings');
      }

      const { data: users, error: fetchErr } = await supabase
        .from('users').select('password_hash').eq('id', req.session.userId).limit(1);
      if (fetchErr) throw fetchErr;

      const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
      if (!valid) {
        req.session.flash_error = 'Current password is incorrect.';
        return htmlRedirect('/settings');
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      const { error: updateErr } = await supabase
        .from('users').update({ password_hash: newHash }).eq('id', req.session.userId);
      if (updateErr) throw updateErr;

      req.session.flash_success = '✅ Password updated successfully!';
      return htmlRedirect('/settings');

    } else {
      // ── Profile update ────────────────────────────────────
      const { fullName, phone, bio } = req.body;

      const updates = {
        full_name: fullName || req.session.userName,
        phone:     phone    || null,
      };
      try { updates.bio = bio || null; } catch(e) {}

      const { error: updateErr } = await supabase
        .from('users').update(updates).eq('id', req.session.userId);
      if (updateErr) throw updateErr;

      req.session.userName = updates.full_name;
      req.session.flash_success = '✅ Profile updated successfully!';
      return htmlRedirect('/settings');
    }
  } catch (err) {
    console.error('Settings POST error:', err.message);
    req.session.flash_error = 'Error: ' + err.message;
    return htmlRedirect('/settings');
  }
});

// ── GET /logout ──────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

module.exports = router;
