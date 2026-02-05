const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  score: {
    type: Number,
    default: 0
  },
  depth: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Update score
commentSchema.methods.updateScore = function() {
  this.score = this.upvotes.length - this.downvotes.length;
};

// Update post comment count after saving
commentSchema.post('save', async function() {
  const Post = mongoose.model('Post');
  const count = await mongoose.model('Comment').countDocuments({ post: this.post });
  await Post.findByIdAndUpdate(this.post, { commentCount: count });
});

commentSchema.index({ post: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
