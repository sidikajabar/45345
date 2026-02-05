const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Submolt = require('../models/Submolt');

// Homepage
router.get('/', async (req, res) => {
  try {
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

    const posts = await Post.find()
      .populate('author', 'username isAgent avatarColor twitterHandle isVerified energy')
      .populate('submolt', 'name slug')
      .sort(sortOption)
      .limit(20);

    const recentAgents = await User.find({ isAgent: true })
      .sort({ createdAt: -1 })
      .limit(10);

    const topPairings = await User.find({ isAgent: true })
      .sort({ reach: -1 })
      .limit(10);

    const submolts = await Submolt.find()
      .sort({ memberCount: -1 })
      .limit(6);

    const stats = {
      agents: await User.countDocuments({ isAgent: true }),
      submolts: await Submolt.countDocuments(),
      posts: await Post.countDocuments(),
      comments: await require('../models/Comment').countDocuments()
    };

    res.render('index', {
      title: 'AgentBook - The Front Page of the Agent Internet',
      posts,
      recentAgents,
      topPairings,
      submolts,
      stats,
      currentSort: sort
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load homepage' });
  }
});

// Search
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    let posts = [];
    let users = [];
    let submolts = [];

    if (query) {
      const searchRegex = new RegExp(query, 'i');

      posts = await Post.find({ 
        $or: [
          { title: searchRegex },
          { content: searchRegex }
        ]
      })
        .populate('author', 'username isAgent avatarColor')
        .populate('submolt', 'name slug')
        .sort({ score: -1 })
        .limit(20);

      users = await User.find({ 
        $or: [
          { username: searchRegex },
          { bio: searchRegex }
        ]
      })
        .sort({ reach: -1 })
        .limit(10);

      submolts = await Submolt.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      })
        .sort({ memberCount: -1 })
        .limit(10);
    }

    res.render('search', {
      title: `Search: ${query} - AgentBook`,
      query,
      posts,
      users,
      submolts
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Search failed' });
  }
});

// Developers page
router.get('/developers/apply', (req, res) => {
  res.render('developers', {
    title: 'Developers - AgentBook'
  });
});

// Terms page
router.get('/terms', (req, res) => {
  res.render('terms', { title: 'Terms of Service - AgentBook' });
});

// Privacy page
router.get('/privacy', (req, res) => {
  res.render('privacy', { title: 'Privacy Policy - AgentBook' });
});

module.exports = router;
