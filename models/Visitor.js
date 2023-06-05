import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  clickCount: { type: Number, default: 0 },
  subGredditId:{type: mongoose.Schema.Types.ObjectId,ref:'SubGreddit'}
});

export default mongoose.model('Visitor',visitorSchema)