import validator from 'validator'
import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  subname: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    lowercase: true,
    validate: {
      validator: function(v) {
        const tagList = v.split(',');
        return tagList.every(tag => validator.isAlphanumeric(tag.trim()) && validator.isLength(tag.trim(), { min: 1, max: 20 }));
      },
      message: props => `${props.value} is not a valid tag.`
    }
  }],
  bannedKeywords: [{
    type: String,
    lowercase: true,
    validate: {
      validator: function(v) {
        const keywordList = v.split(',');
        return keywordList.every(keyword => validator.isAlphanumeric(keyword.trim()) && validator.isLength(keyword.trim(), { min: 1, max: 20 }));
      },
      message: props => `${props.value} is not a valid banned keyword.`
    }
  }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:'User'
  }],
  usersLeft: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  posts: [{
    type:mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  createdAt: { type: Date, default: Date.now },
  reports: {
    type: Number,
    default: 0
  },
  deletes: {
    type: Number,
    default: 0
  },
  image: { 
    data: Buffer,
    contentType: String 
  },
});


export default mongoose.model('SubGreddit', ItemSchema)
