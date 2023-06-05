import express from 'express'
const router = express.Router();
import Follower from '../models/Followers.js'
import Following from '../models/Following.js'
import User from '../models/User.js';
import { StatusCodes } from 'http-status-codes';

router.get('/followers', async (req, res) => {
  const currentUserId = req.user.userId
  try {
    const follower = await Follower.findOne({ userId: currentUserId }).populate('followers');
    res.send({followers:follower.followers,noOfFollowers:follower.followers.length,noOfPages:1});
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

router.get('/following', async (req, res) => {
  const currentUserId = req.user.userId
  try {
    const following = await Following.findOne({ userId: currentUserId }).populate('following');
    res.json({following:following.following,noOfFollowing:following.following.length,noOfPages:1});
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

router.post('/follow', async (req, res) => {
  const currentUserId = req.user.userId;
  const followedId = req.body.followingId;

  // Check if the current user is already following the other user
  const isFollowing = await Follower.exists({ userId: currentUserId, followers: { $in: [followedId] } });
  const isFollower = await Following.exists({ userId: currentUserId, followers: { $in: [followedId] } });
  if (isFollowing) {
    return res.status(StatusCodes.BAD_REQUEST).send('Already following');
  }

  Follower.findOneAndUpdate(
    { userId: currentUserId },
    { $addToSet: { followers: followedId } },
    { upsert: true, new: true },
    (err, follow) => {
      if (err) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(err);
      }
      res.send(follow);
    }
  );

  Following.findOneAndUpdate(
    { userId: followedId },
    { $addToSet: { following: currentUserId } },
    { upsert: true, new: true },
    (err, follow) => {
      if (err) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(err);
      }
    }
  );
});


router.delete('/removefollower/:id', async (req, res) => {
  const currentUserId = req.user.userId;
  try {
    const follower = await Follower.findOne({ userId: currentUserId });
    const following = await Following.findOne({ userId: req.params.id });
    follower.followers = follower.followers.filter(id => !id.equals(following.userId));
    following.following = following.following.filter(id => !id.equals(follower.userId));

    await follower.save();
    await following.save();
    res.send({ message: 'Follow relationship deleted.' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

router.delete('/unfollow/:id', async (req, res) => {
  const currentUserId = req.user.userId;
  try {
    const follower = await Follower.findOne({ userId: req.params.id });
    const following = await Following.findOne({ userId: currentUserId });

    follower.followers = follower.followers.filter(id => !id.equals(following.userId));
    following.following = following.following.filter(id => !id.equals(follower.userId));

    await follower.save();
    await following.save();
    res.send({ message: 'Follow relationship deleted.' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
  
});

export default router
