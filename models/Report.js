import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reportedIn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubGreddit",
    required: true
  },
  concern: {
    type: String,
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true
  },
  createdAt: { type: Number, default: Date.now() },
  ignore: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model('Report', ReportSchema)