const express  = require('express');
const bcrypt   = require('bcryptjs');
const supabase = require('../config/db');
const { guestOnly } = require('../middleware/auth');
const router   = express.Router();

// ── GET /login ──────────────────────────────────────────────
router.get('/login', guestOnly, (req, res) => {
  res.render('login', {
  });
});

// ── POST /login ─────────────────────────────────────────────
router.post('/login', guestOnly, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flashError( 'Email and password are required.');
    return res.redirect('/login');
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (error) throw error;
    const user = users[0];

    if (!user) {
      req.flashError( 'No account found with that email.');
      return res.redirect('/login');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      req.flashError( 'Incorrect password.');
      return res.redirect('/login');
    }

    req.session.userId   = user.id;
    req.session.userName = user.full_name;
    req.session.userPlan = user.plan;

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err.message);
    req.flashError( 'Something went wrong. Please try again.');
    res.redirect('/login');
  }
});

// ── GET /signup ─────────────────────────────────────────────
router.get('/signup', guestOnly, (req, res) => {
  res.render('signup', {
  });
});

// ── POST /signup ────────────────────────────────────────────
router.post('/signup', guestOnly, async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) {
    req.flashError( 'Name, email, and password are required.');
    return res.redirect('/signup');
  }
  if (password.length < 8) {
    req.flashError( 'Password must be at least 8 characters.');
    return res.redirect('/signup');
  }

  try {
    // Check duplicate email
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (existing && existing.length > 0) {
      req.flashError( 'An account with that email already exists.');
      return res.redirect('/signup');
    }

    const hash = await bcrypt.hash(password, 12);

    const { data: newUsers, error } = await supabase
      .from('users')
      .insert({
        full_name:     fullName,
        email:         email.toLowerCase().trim(),
        phone:         phone || null,
        password_hash: hash,
      })
      .select();

    if (error) throw error;

    const user = newUsers[0];
    req.session.userId   = user.id;
    req.session.userName = user.full_name;
    req.session.userPlan = user.plan;

    req.flashSuccess( 'Account created! Welcome to FIRTA.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Signup error:', err.message);
    req.flashError( 'Something went wrong. Please try again.');
    res.redirect('/signup');
  }
});

// ── GET /logout ─────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session = null; res.redirect("/login");;
});

module.exports = router;
