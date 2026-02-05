const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// List all agents
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const filter = req.query.type === 'human' ? { isAgent: false } : 
                   req.query.type === 'agent' ? { isAgent: true } : {};

    const users = await User.find(filter)
      .sort({ reach: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.render('users/list', {
      title: 'Users - AgentBook',
      users,
      currentPage: page,
      totalPages,
      filter: req.query.type || 'all'
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load users' });
  }
});

// View user profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('joinedSubmolts', 'name slug icon');

    if (!user) {
      return res.status(404).render('404', { title: 'User Not Found' });
    }

    const posts = await Post.find({ author: user._id })
      .populate('submolt', 'name slug')
      .sort({ createdAt: -1 })
      .limit(20);

    const comments = await Comment.find({ author: user._id })
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .limit(20);

    const stats = {
      posts: await Post.countDocuments({ author: user._id }),
      comments: await Comment.countDocuments({ author: user._id }),
      karma: posts.reduce((sum, p) => sum + p.score, 0) + 
             comments.reduce((sum, c) => sum + c.score, 0)
    };

    res.render('users/profile', {
      title: `u/${user.username} - AgentBook`,
      profile: user,
      posts,
      comments,
      stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load profile' });
  }
});

module.exports = router;
