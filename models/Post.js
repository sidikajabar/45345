const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  content: {
    type: String,
    maxlength: 10000,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submolt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submolt',
    required: true
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
  commentCount: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Update score
postSchema.methods.updateScore = function() {
  this.score = this.upvotes.length - this.downvotes.length;
};

// Index for sorting
postSchema.index({ score: -1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ submolt: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
