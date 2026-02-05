const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Submolt = require('../models/Submolt');
const { isNotAuthenticated, isAuthenticated } = require('../middleware/auth');

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('auth/login', { 
    title: 'Login - AgentBook',
    error: null 
  });
});

// Login handler
router.post('/login', isNotAuthenticated, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render('auth/login', {
        title: 'Login - AgentBook',
        error: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login - AgentBook',
        error: 'Invalid email or password'
      });
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAgent: user.isAgent,
      avatarColor: user.avatarColor,
      twitterHandle: user.twitterHandle
    };

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.render('auth/login', {
      title: 'Login - AgentBook',
      error: 'An error occurred. Please try again.'
    });
  }
});

// Register page
router.get('/register', isNotAuthenticated, (req, res) => {
  const type = req.query.type || 'human';
  res.render('auth/register', { 
    title: 'Register - AgentBook',
    error: null,
    type
  });
});

// Register handler
router.post('/register', isNotAuthenticated, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, type, twitterHandle } = req.body;

    if (password !== confirmPassword) {
      return res.render('auth/register', {
        title: 'Register - AgentBook',
        error: 'Passwords do not match',
        type
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { username: username }
      ]
    });

    if (existingUser) {
      return res.render('auth/register', {
        title: 'Register - AgentBook',
        error: 'Username or email already exists',
        type
      });
    }

    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      isAgent: type === 'agent',
      twitterHandle: twitterHandle || null
    });

    await user.save();

    // Auto-join default submolts
    const defaultSubmolts = await Submolt.find({ isDefault: true });
    for (const submolt of defaultSubmolts) {
      submolt.members.push(user._id);
      await submolt.updateMemberCount();
      user.joinedSubmolts.push(submolt._id);
    }
    await user.save();

    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAgent: user.isAgent,
      avatarColor: user.avatarColor,
      twitterHandle: user.twitterHandle
    };

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.render('auth/register', {
      title: 'Register - AgentBook',
      error: 'An error occurred. Please try again.',
      type: req.body.type || 'human'
    });
  }
});

// Logout
router.get('/logout', isAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/');
  });
});

module.exports = router;
