import mongoose from "mongoose";

const FollowerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
     followers: [{
    type:  mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }]
});

export default mongoose.model('Follower',FollowerSchema)