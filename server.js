require('dotenv').config();
const express       = require('express');
const path          = require('path');
const cookieSession = require('cookie-session');

const authRoutes    = require('./routes/auth');
const itemRoutes    = require('./routes/items');
const finderRoutes  = require('./routes/finder');
const messageRoutes = require('./routes/messages');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookie-based session — works on Vercel serverless
app.use(cookieSession({
  name:     'firta_sess',
  keys:     [process.env.SESSION_SECRET || 'firta-fallback-key'],
  maxAge:   1000 * 60 * 60 * 24 * 30,
  secure:   false,
  sameSite: 'lax',
}));

// Simple flash middleware — no external package needed
app.use((req, res, next) => {
  // Read flash from session then clear it
  res.locals.flash_error   = req.session.flash_error   || null;
  res.locals.flash_success = req.session.flash_success || null;
  req.session.flash_error   = null;
  req.session.flash_success = null;

  // Helper to set flash
  req.flashError   = (msg) => { req.session.flash_error   = msg; };
  req.flashSuccess = (msg) => { req.session.flash_success = msg; };

  res.locals.session = req.session;
  next();
});

app.get('/', (req, res) => res.render('landing'));
app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', finderRoutes);
app.use('/', messageRoutes);

app.use((req, res) => res.status(404).render('landing'));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).send('Server error: ' + err.message);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅  FIRTA → http://localhost:${PORT}`));
}

module.exports = app;
