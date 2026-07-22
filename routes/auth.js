const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || '';
const TOKEN_EXPIRY = '7d';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/signup  { email, password }
router.post('/signup', async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Server is not configured (missing JWT_SECRET).' });
    }

    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.status(201).json({ token, email: user.email });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Server is not configured (missing JWT_SECRET).' });
    }

    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token, email: user.email });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

module.exports = router;
