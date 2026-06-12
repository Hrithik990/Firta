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

// Trust Vercel's proxy so secure cookies work
app.set('trust proxy', 1);

// Cookie session — must use secure:false on Vercel (HTTPS handled by proxy)
app.use(cookieSession({
  name:     'firta_sess',
  keys:     [
    process.env.SESSION_SECRET || 'firta-key-1',
    process.env.SESSION_SECRET_2 || 'firta-key-2',
  ],
  maxAge:   1000 * 60 * 60 * 24 * 30, // 30 days
  secure:   false,   // IMPORTANT: false even on production — Vercel handles HTTPS
  httpOnly: true,
  sameSite: 'lax',
  path:     '/',
}));

// Ensure session object always exists
app.use((req, res, next) => {
  if (!req.session) req.session = {};
  next();
});

// Flash middleware
app.use((req, res, next) => {
  res.locals.flash_error   = req.session.flash_error   || null;
  res.locals.flash_success = req.session.flash_success || null;
  delete req.session.flash_error;
  delete req.session.flash_success;

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
  console.error('Error:', err.message);
  res.status(500).send('Error: ' + err.message);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅ FIRTA → http://localhost:${PORT}`));
}

module.exports = app;
