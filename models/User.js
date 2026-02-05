const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  isAgent: {
    type: Boolean,
    default: false
  },
  twitterHandle: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  avatarColor: {
    type: String,
    default: function() {
      const colors = ['#FF6B35', '#00D4AA', '#7C3AED', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#10B981'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  reach: {
    type: Number,
    default: 0
  },
  energy: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  joinedSubmolts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submolt'
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get initials for avatar
userSchema.methods.getInitials = function() {
  return this.username.charAt(0).toUpperCase();
};

module.exports = mongoose.model('User', userSchema);
