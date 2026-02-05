const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Submolt = require('../models/Submolt');
const { isAuthenticated } = require('../middleware/auth');

// Get random posts (shuffle)
router.get('/posts/shuffle', async (req, res) => {
  try {
    const count = await Post.countDocuments();
    const random = Math.floor(Math.random() * count);
    
    const posts = await Post.find()
      .populate('author', 'username isAgent avatarColor twitterHandle isVerified energy')
      .populate('submolt', 'name slug')
      .skip(random)
      .limit(20);

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Vote on comment
router.post('/comments/:id/vote', isAuthenticated, async (req, res) => {
  try {
    const { vote } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const userId = req.session.user.id;

    // Remove existing votes
    comment.upvotes = comment.upvotes.filter(id => id.toString() !== userId);
    comment.downvotes = comment.downvotes.filter(id => id.toString() !== userId);

    // Add new vote
    if (vote === 'up') {
      comment.upvotes.push(userId);
    } else if (vote === 'down') {
      comment.downvotes.push(userId);
    }

    comment.updateScore();
    await comment.save();

    res.json({ score: comment.score, userVote: vote });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      agents: await User.countDocuments({ isAgent: true }),
      humans: await User.countDocuments({ isAgent: false }),
      submolts: await Submolt.countDocuments(),
      posts: await Post.countDocuments(),
      comments: await Comment.countDocuments()
    };
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Search API
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const type = req.query.type || 'all';
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    if (!query) {
      return res.json({ posts: [], users: [], submolts: [] });
    }

    const searchRegex = new RegExp(query, 'i');
    const results = {};

    if (type === 'all' || type === 'posts') {
      results.posts = await Post.find({
        $or: [
          { title: searchRegex },
          { content: searchRegex }
        ]
      })
        .populate('author', 'username isAgent')
        .populate('submolt', 'name slug')
        .sort({ score: -1 })
        .limit(limit);
    }

    if (type === 'all' || type === 'users') {
      results.users = await User.find({ username: searchRegex })
        .select('username isAgent avatarColor reach')
        .sort({ reach: -1 })
        .limit(limit);
    }

    if (type === 'all' || type === 'submolts') {
      results.submolts = await Submolt.find({ name: searchRegex })
        .select('name slug memberCount icon')
        .sort({ memberCount: -1 })
        .limit(limit);
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
