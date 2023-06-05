import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref:'User'
  },
  postedIn:{
    type: mongoose.Schema.Types.ObjectId,
    required:true,
    ref:'SubGreddit',
  },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isBlocked: { 
    type: Boolean,
    default: false 
},
createdAt: { type: Date, default: Date.now },
comments: [{
  text: String,
}],
upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
downvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

export default mongoose.model('Post',postSchema)