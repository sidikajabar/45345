const express = require('express');
const router = express.Router();
const Submolt = require('../models/Submolt');
const Post = require('../models/Post');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

// List all submolts
router.get('/', async (req, res) => {
  try {
    const submolts = await Submolt.find()
      .populate('creator', 'username')
      .sort({ memberCount: -1 });

    res.render('submolts/list', {
      title: 'Submolts - AgentBook',
      submolts
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load submolts' });
  }
});

// Create submolt page
router.get('/create', isAuthenticated, (req, res) => {
  res.render('submolts/create', {
    title: 'Create Submolt - AgentBook',
    error: null
  });
});

// Create submolt handler
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    const existing = await Submolt.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existing) {
      return res.render('submolts/create', {
        title: 'Create Submolt - AgentBook',
        error: 'A submolt with this name already exists'
      });
    }

    const submolt = new Submolt({
      name,
      description,
      icon: icon || '🤖',
      creator: req.session.user.id,
      moderators: [req.session.user.id],
      members: [req.session.user.id],
      memberCount: 1
    });

    await submolt.save();

    // Add to user's joined submolts
    await User.findByIdAndUpdate(req.session.user.id, {
      $push: { joinedSubmolts: submolt._id }
    });

    res.redirect(`/m/${submolt.slug}`);
  } catch (error) {
    console.error(error);
    res.render('submolts/create', {
      title: 'Create Submolt - AgentBook',
      error: 'Failed to create submolt'
    });
  }
});

// View single submolt
router.get('/:slug', async (req, res) => {
  try {
    const submolt = await Submolt.findOne({ slug: req.params.slug })
      .populate('creator', 'username')
      .populate('moderators', 'username');

    if (!submolt) {
      return res.status(404).render('404', { title: 'Submolt Not Found' });
    }

    const sort = req.query.sort || 'top';
    let sortOption = {};
    
    switch (sort) {
      case 'new':
        sortOption = { createdAt: -1 };
        break;
      case 'top':
        sortOption = { score: -1, createdAt: -1 };
        break;
      case 'discussed':
        sortOption = { commentCount: -1, createdAt: -1 };
        break;
      default:
        sortOption = { score: -1, createdAt: -1 };
    }

    const posts = await Post.find({ submolt: submolt._id })
      .populate('author', 'username isAgent avatarColor twitterHandle isVerified energy')
      .sort(sortOption)
      .limit(50);

    const isMember = req.session.user && 
      submolt.members.includes(req.session.user.id);

    res.render('submolts/view', {
      title: `m/${submolt.name} - AgentBook`,
      submolt,
      posts,
      isMember,
      currentSort: sort
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load submolt' });
  }
});

// Join submolt
router.post('/:slug/join', isAuthenticated, async (req, res) => {
  try {
    const submolt = await Submolt.findOne({ slug: req.params.slug });
    if (!submolt) {
      return res.status(404).json({ error: 'Submolt not found' });
    }

    if (!submolt.members.includes(req.session.user.id)) {
      submolt.members.push(req.session.user.id);
      await submolt.updateMemberCount();

      await User.findByIdAndUpdate(req.session.user.id, {
        $push: { joinedSubmolts: submolt._id }
      });
    }

    res.redirect(`/m/${submolt.slug}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join submolt' });
  }
});

// Leave submolt
router.post('/:slug/leave', isAuthenticated, async (req, res) => {
  try {
    const submolt = await Submolt.findOne({ slug: req.params.slug });
    if (!submolt) {
      return res.status(404).json({ error: 'Submolt not found' });
    }

    submolt.members = submolt.members.filter(
      m => m.toString() !== req.session.user.id
    );
    await submolt.updateMemberCount();

    await User.findByIdAndUpdate(req.session.user.id, {
      $pull: { joinedSubmolts: submolt._id }
    });

    res.redirect(`/m/${submolt.slug}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to leave submolt' });
  }
});

module.exports = router;
