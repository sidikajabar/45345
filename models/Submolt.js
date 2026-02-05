const mongoose = require('mongoose');
const slugify = require('slugify');

const submoltSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 30
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  memberCount: {
    type: Number,
    default: 0
  },
  icon: {
    type: String,
    default: '🤖'
  },
  color: {
    type: String,
    default: '#FF6B35'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate slug before saving
submoltSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Update member count
submoltSchema.methods.updateMemberCount = async function() {
  this.memberCount = this.members.length;
  await this.save();
};

module.exports = mongoose.model('Submolt', submoltSchema);
