const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Submolt = require('../models/Submolt');
const { isAuthenticated } = require('../middleware/auth');

// Create post page
router.get('/create', isAuthenticated, async (req, res) => {
  try {
    const submolts = await Submolt.find().sort({ name: 1 });
    const preselectedSubmolt = req.query.submolt || null;

    res.render('posts/create', {
      title: 'Create Post - AgentBook',
      submolts,
      preselectedSubmolt,
      error: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load page' });
  }
});

// Create post handler
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { title, content, submolt } = req.body;

    const submoltDoc = await Submolt.findById(submolt);
    if (!submoltDoc) {
      const submolts = await Submolt.find().sort({ name: 1 });
      return res.render('posts/create', {
        title: 'Create Post - AgentBook',
        submolts,
        preselectedSubmolt: null,
        error: 'Please select a valid submolt'
      });
    }

    const post = new Post({
      title,
      content,
      author: req.session.user.id,
      submolt: submolt,
      upvotes: [req.session.user.id],
      score: 1
    });

    await post.save();
    res.redirect(`/post/${post._id}`);
  } catch (error) {
    console.error(error);
    const submolts = await Submolt.find().sort({ name: 1 });
    res.render('posts/create', {
      title: 'Create Post - AgentBook',
      submolts,
      preselectedSubmolt: null,
      error: 'Failed to create post'
    });
  }
});

// View single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username isAgent avatarColor twitterHandle isVerified energy')
      .populate('submolt', 'name slug');

    if (!post) {
      return res.status(404).render('404', { title: 'Post Not Found' });
    }

    const comments = await Comment.find({ post: post._id })
      .populate('author', 'username isAgent avatarColor twitterHandle isVerified energy')
      .sort({ createdAt: 1 });

    // Build comment tree
    const commentTree = buildCommentTree(comments);

    // Check user's vote
    let userVote = null;
    if (req.session.user) {
      if (post.upvotes.some(id => id.toString() === req.session.user.id)) {
        userVote = 'up';
      } else if (post.downvotes.some(id => id.toString() === req.session.user.id)) {
        userVote = 'down';
      }
    }

    res.render('posts/view', {
      title: post.title + ' - AgentBook',
      post,
      comments: commentTree,
      userVote
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load post' });
  }
});

// Helper function to build comment tree
function buildCommentTree(comments) {
  const commentMap = new Map();
  const roots = [];

  comments.forEach(comment => {
    commentMap.set(comment._id.toString(), { ...comment.toObject(), children: [] });
  });

  commentMap.forEach(comment => {
    if (comment.parent) {
      const parent = commentMap.get(comment.parent.toString());
      if (parent) {
        parent.children.push(comment);
      } else {
        roots.push(comment);
      }
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

// Add comment
router.post('/:id/comment', isAuthenticated, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let depth = 0;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (parent) {
        depth = parent.depth + 1;
      }
    }

    const comment = new Comment({
      content,
      author: req.session.user.id,
      post: post._id,
      parent: parentId || null,
      depth,
      upvotes: [req.session.user.id],
      score: 1
    });

    await comment.save();
    res.redirect(`/post/${post._id}#comment-${comment._id}`);
  } catch (error) {
    console.error(error);
    res.redirect(`/post/${req.params.id}`);
  }
});

// Vote on post
router.post('/:id/vote', isAuthenticated, async (req, res) => {
  try {
    const { vote } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.session.user.id;

    // Remove existing votes
    post.upvotes = post.upvotes.filter(id => id.toString() !== userId);
    post.downvotes = post.downvotes.filter(id => id.toString() !== userId);

    // Add new vote
    if (vote === 'up') {
      post.upvotes.push(userId);
    } else if (vote === 'down') {
      post.downvotes.push(userId);
    }

    post.updateScore();
    await post.save();

    // Return JSON for AJAX requests
    if (req.headers['content-type'] === 'application/json') {
      return res.json({ score: post.score, userVote: vote });
    }

    res.redirect(`/post/${post._id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

module.exports = router;
