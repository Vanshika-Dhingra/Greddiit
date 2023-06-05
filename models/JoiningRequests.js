import mongoose from "mongoose";

const JoiningRequestsSchema = new mongoose.Schema({
    subGredditId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    name:{
      type:String,
    },
    banned: { type: Boolean, default: false }
});

export default mongoose.model('JoiningRequests',JoiningRequestsSchema)