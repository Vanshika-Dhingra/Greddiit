import express, { query } from 'express'
const router = express.Router();
import SubGreddit from '../models/SubGreddit.js';
import User from '../models/User.js';
import JoiningRequests from '../models/JoiningRequests.js';
import Post from '../models/Posts.js'
import Follower from '../models/Followers.js'
import Following from '../models/Following.js'
import Report from '../models/Report.js'
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import moment from 'moment';
import Visitor from '../models/Visitor.js'
import Fuse from 'fuse.js'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'vanshikadhingra1030@gmail.com',
      pass: 'fpbkrfdcqupcljgn'
    }
  });

const checkPermissions = (requestUserId, resourceUserId) => {
    if (requestUserId === resourceUserId) return
    const e = new Error('authentication error', StatusCodes.UNAUTHORIZED)
    e.name = "authenticationError"
    throw e
}

router.post('/newSubGreddit', async (req, res) => {
    const user = await User.findOne({ _id: req.user.userId });
    const { subname, description, tags, bannedKeywords } = req.body;
    const { userId } = req.user
    const subgreddit = new SubGreddit({
        subname: subname,
        description: description,
        tags: tags,
        bannedKeywords: bannedKeywords,
        userId: userId,
    });
    subgreddit.followers.push(req.user.userId)
    try {
        const newSubGreddit = await subgreddit.save();
        res.status(201).json(newSubGreddit);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/getMySubGreddits', async (req, res) => {
    try {
        const mySubGreddits = await SubGreddit.find({ userId: req.user.userId });
        res.json(mySubGreddits);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

router.delete('/deleteSubGreddit/:id', async (req, res) => {
    console.log(req.user.userId)
    try {
        const sub = await SubGreddit.findOne({ _id: req.params.id })
        checkPermissions(sub.userId.toString(), req.user.userId)
        const posts = await Post.deleteMany({ postedIn: req.params.id })
        const report = await Report.deleteMany({ reportedIn: req.params.id })
        const subgreddit = await SubGreddit.deleteOne({ _id: req.params.id });
        res.json('subGreddit deleted')
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

router.get('/users/:id', async (req, res) => {
    try {
        const subGreddit = await SubGreddit.findOne({ _id: req.params.id }).populate('followers').populate('blockedUsers')
        checkPermissions(subGreddit.userId.toString(), req.user.userId)
        const bannedFollowers = subGreddit.followers
        const unBannedFollowers = subGreddit.blockedUsers
        res.send([bannedFollowers, unBannedFollowers]);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
})

router.post('/joiningRequests', async (req, res) => {
    const subGreddit = await SubGreddit.findOne({ _id: req.body.id })
    const user = await User.findOne({ _id: req.user.userId });
    const joinRequest = new JoiningRequests({
        userId: req.user.userId,
        name: user.firstname,
        banned: false,
        subGredditId: req.body.id,
    });
    const result1 = subGreddit.followers.find(id => `${id}` === req.user.userId)
    const result = subGreddit.usersLeft.find(id => `${id}` === req.user.userId)
    try {
        if (result === undefined && result1 === undefined) {
            const newJoinRequest = await joinRequest.save();
            const joinReq = await JoiningRequests.find({ userId: req.user.userId,subGredditId:req.body.id })
            if (joinReq.length === 2) {
                const response = await JoiningRequests.deleteOne({ userId: req.user.userId })
                return res.status(201).json('already requested')
            }
            else {
                return res.status(201).json('request sent');
            }
        }
        else {
            return res.status(201).json('not allowed')
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
})

router.get('/getJoiningRequests/:id', async (req, res) => {
    try {
        const subGreddiit = await SubGreddit.findOne({_id:req.params.id})
        checkPermissions(subGreddiit.userId.toString(),req.user.userId)
        const joiningRequest = await JoiningRequests.find({ subGredditId: req.params.id })
        const result = joiningRequest.find(request => (request.userId.toString() === req.user.userId))
        if (result === undefined) {
            res.json(joiningRequest)
        }
        else {
            res.status(401).json({ message: 'unauthorised' })
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

router.delete('/acceptRequest', async (req, res) => {
    try {
        const subGreddit = await SubGreddit.findOne({ _id: req.query.subGredditId })
        checkPermissions(subGreddit.userId.toString(), req.user.userId)
        const user = await User.findOne({ _id: req.query.userId })
        const joiningRequest = await JoiningRequests.findOne({ userId: user._id })
        subGreddit.followers.push(user._id)
        const response = await JoiningRequests.deleteOne({ _id: joiningRequest._id })
        await subGreddit.save()
        res.json({ message: 'Request accepted' })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

router.delete('/rejectRequest', async (req, res) => {
    try {
        const subGreddit = await SubGreddit.findOne({ _id: req.query.subGredditId })
        checkPermissions(subGreddit.userId.toString(), req.user.userId)
        const user = await User.findOne({ _id: req.query.userId })
        const joiningRequest = await JoiningRequests.findOne({ userId: user._id })
        const response = await JoiningRequests.deleteOne({ _id: joiningRequest._id })
        await subGreddit.save()
        res.send({ message: 'Request Rejected' })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

router.get(`/allSubGreddits`, async (req, res) => {
    try {
        const { search, sort, tags } = req.query;
        let queryObject = {};
        if (search) {
            const subGreddits = await SubGreddit.find();
            const options = {
                includeScore: true,
                keys: ['subname'],
                threshold: 0.4, 
            };
            const fuse = new Fuse(subGreddits, options);
            const searchResults = fuse.search(search);
            const searchIds = searchResults.map((result) => result.item._id);
            queryObject = { _id: { $in: searchIds } };
        } else {
            queryObject = {};
        }
        let result = SubGreddit.find(queryObject);
        if (sort === 'latest') {
            result = result.sort('-createdAt');
        }
        if (sort === 'nameasc') {
            result = result.sort('subname');
        }
        if (sort === 'namedsc') {
            result = result.sort('-subname');
        }
        if (sort === "followers") {
            result = await result; 
            result = result.sort((a, b) => b.followers.length - a.followers.length);
        }
        if(sort!=="followers"){
        let subGreddit = await result

        let filteredSubreddits = subGreddit
        if (tags) {
            const selectedTags = tags.split(',');

            filteredSubreddits = subGreddit.filter((subreddit) =>
                subreddit.tags.some((tag) => selectedTags.includes(tag))
            );
        }
        const results = filteredSubreddits.filter(subgreddit => {
            return subgreddit.followers.some(follower => {
                return `${follower._id}` === req.user.userId;
            });
        });
        return res.status(200).json(results)
    }
    else{
        let subGreddit = result

        let filteredSubreddits = subGreddit
        if (tags) {
            const selectedTags = tags.split(',');

            filteredSubreddits = subGreddit.filter((subreddit) =>
                subreddit.tags.some((tag) => selectedTags.includes(tag))
            );
        }
        const results = filteredSubreddits.filter(subgreddit => {
            return subgreddit.followers.some(follower => {
                return `${follower._id}` === req.user.userId;
            });
        });
        return res.status(200).json(results)
    }

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.get('/remainingSubGreddits', async (req, res) => {
    try {
        const { search, sort, tags } = req.query

        let queryObject = {}
        if (search) {
        const subGreddits = await SubGreddit.find();
        const options = {
            includeScore: true,
            keys: ['subname'], 
            threshold: 0.4,
        };
        const fuse = new Fuse(subGreddits, options);
        const searchResults = fuse.search(search);
        const searchIds = searchResults.map((result) => result.item._id);
        queryObject = { _id: { $in: searchIds } };
    } else {
        queryObject = {};
    }
        let result = SubGreddit.find(queryObject)

        if (sort === 'latest') {
            result = result.sort('-createdAt')
        }
        if (sort === 'nameasc') {
            result = result.sort('subname')
        }
        if (sort === 'namedsc') {
            result = result.sort('-subname')
        }
        if (sort === "followers") {
            result = await result; 
            result = result.sort((a, b) => b.followers.length - a.followers.length);
        }
        if(sort!=="followers"){
        let subGreddit = await result

        let filteredSubreddits = subGreddit
        if (tags) {
            const selectedTags = tags.split(',');

            filteredSubreddits = subGreddit.filter((subreddit) =>
                subreddit.tags.some((tag) => selectedTags.includes(tag))
            );
        }
        const results = filteredSubreddits.filter(subgreddit => {
            return subgreddit.followers.some(follower => {
                return `${follower._id}` === req.user.userId;
            });
        });
        return res.status(200).json(results)
    }
    else{
        let subGreddit = result

        let filteredSubreddits = subGreddit
        if (tags) {
            const selectedTags = tags.split(',');

            filteredSubreddits = subGreddit.filter((subreddit) =>
                subreddit.tags.some((tag) => selectedTags.includes(tag))
            );
        }
        const results = filteredSubreddits.filter(subgreddit => {
            return subgreddit.followers.some(follower => {
                return `${follower._id}` === req.user.userId;
            });
        });
        return res.status(200).json(results)
    }

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


router.delete('/leaveSubGreddit/:id', async (req, res) => {
    try {
        console.log(req)
        const subGreddit = await SubGreddit.findOne({ _id: req.params.id })
        subGreddit.followers = subGreddit.followers.filter(id => `${id}` !== req.user.userId)
        subGreddit.usersLeft.push(req.user.userId)
        await subGreddit.save()
        console.log(subGreddit.followers)
        res.send({ message: 'sub greddit left' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
router.get('/findSubGreddit/:id', async (req, res) => {
    try {
        const subGreddit = await SubGreddit.findOne({ _id: req.params.id })
        res.json(subGreddit)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// router.post('/newPost/:id', async (req, res) => {
//     const subGreddit = await SubGreddit.findOne({ _id: req.params.id })
//     const post = new Post({
//         text: req.body.postText,
//         postedBy: req.user.userId,
//         postedIn: req.params.id,
//         upvotes: 0,
//         downvotes: 0,
//     })
//     subGreddit.posts.push(post._id)
//     let isBannedKeywords = false
//     try {
//         subGreddit.bannedKeywords.forEach(keyword => {
//             if (post.text.toLowerCase().includes(keyword.toLowerCase())) {
//                 post.text = post.text.replace(new RegExp(keyword, 'gi'), '*');
//                 isBannedKeywords = true
//             }
//         });
//         const newPost = await post.save()
//         const newsubGredditPost = await subGreddit.save();
//         res.status(201).json(isBannedKeywords)
//     } catch (error) {
//         res.status(500).json({ message: error.message })
//     }
// })

router.post('/newPost/:id', async (req, res) => {
    const subGreddit = await SubGreddit.findOne({ _id: req.params.id })
    if (!req.body.postText) {
        return res.status(200).json('Post text cannot be empty')
    }
    const post = new Post({
        text: req.body.postText,
        postedBy: req.user.userId,
        postedIn: req.params.id,
        upvotes: 0,
        downvotes: 0,
    })
    subGreddit.posts.push(post._id)
    let isBannedKeywords = false
    try {
        subGreddit.bannedKeywords.forEach(keyword => {
            if (post.text.toLowerCase().includes(keyword.toLowerCase())) {
                post.text = post.text.replace(new RegExp(keyword, 'gi'), '*');
                isBannedKeywords = true
            }
        });
        const newPost = await post.save()
        const newsubGredditPost = await subGreddit.save();
        if(isBannedKeywords===true)
         return res.status(201).json('you have banned keywords')
        else
         return res.status(201).json('new post created')
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


router.get('/getPosts/:id', async (req, res) => {
    try {
        const subGreddit = await SubGreddit.findOne({ _id: req.params.id }).populate('posts')
        const populatedPosts = await Promise.all(subGreddit.posts.map(async post => {
            const result = await post.populate('postedBy');
            if (post.isBlocked === true) {
                post.postedBy.firstname = 'Blocked User'
                post.postedBy.lastname = 'Blocked User'
            }
            return post
        }));
        console.log(populatedPosts)
        res.json(subGreddit.posts)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.delete('/upvote/:id', async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id })
        if (post.upvoters.includes(req.user._id)) {
            return res.status(200).json("You have already upvoted this post" )
        }
        post.upvoters.push(req.user._id)
        post.upvotes = post.upvotes + 1
        await post.save()
        
        res.json('upvoted')
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.delete('/downvote/:id', async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id })
        if (post.downvoters.includes(req.user._id)) {
            return res.status(200).json("You have already downvoted this post")
        }
        post.downvoters.push(req.user._id)
        post.downvotes = post.downvotes + 1
        await post.save()
        
        res.json('downvoted')
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


router.post('/savedPosts', async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.body.id })
        post.users.push(req.user.userId)
        post.save()
        res.json('post saved')
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.post('/followPoster', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.body.id })
        console.log(user._id.toString())
        if (user._id.toString()===(req.user.userId)) {
            return res.status(400).json( "Cannot follow yourself")
        }
        const follower = await Follower.findOne({ userId: user._id })
        const following = await Following.findOne({ userId: req.user.userId })
        following.following.push(user._id)
        follower.followers.push(req.user.userId)
        follower.save()
        following.save()
        res.status(200).json('followed')
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


router.get('/getSavedPosts', async (req, res) => {
    try {
        const posts = await Post.find({}).populate('postedIn').populate('postedBy')
        const savedPosts = posts.filter(post => {
            return post.users.some(user => {
                return `${user._id}` === req.user.userId;
            });
        })
        res.json(savedPosts)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.post('/unSave', async (req, res) => {
    try {
        console.log(req.user.userId)
        const post = await Post.findOne({ _id: req.body.id })
        post.users = post.users.filter(id => {
            return id.toString() !== req.user.userId
        })
        post.save()
        res.json(post)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.post('/report', async (req, res) => {
    const post = await Post.findOne({ _id: req.body.id })
    const subGreddit= await SubGreddit.findOne({_id:req.body.subGredditId})
    subGreddit.reports=subGreddit.reports+1
    
    if (!req.body.concern) {
        return res.status(200).json('Concern field is required')
    }
    
    const report = new Report({
        reportedBy: req.user.userId,
        reportedUser: req.body.userId,
        reportedIn: req.body.subGredditId,
        concern: req.body.concern,
        post: post,
    })
    try {
        subGreddit.save()
        const newReport = await report.save()
        res.status(201).json('user reported')
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


router.get('/getReportedPosts/:id', async (req, res) => {
    try {
        const tenDaysInMilliseconds = 10 * 24 * 60 * 60 * 1000;
        const reportedPosts = await Report.find({ reportedIn: req.params.id }).populate('post').populate('reportedBy').populate('reportedUser')
        const finalPosts = reportedPosts.filter(post => {
            console.log(Date.now() - post.createdAt)
            console.log(tenDaysInMilliseconds)
            return (Date.now() - post.createdAt < tenDaysInMilliseconds)
        })
        const postToDelete = await Report.findOneAndDelete({
            createdAt: { $lt: tenDaysInMilliseconds }
        });

        res.json(finalPosts)
    } catch (error) {
        res.status(200).send({ message: error.message })
    }
})

router.post('/blockUser', async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.body.postId }).populate('postedBy')
        post.isBlocked = true
        const report = await Report.findOne({post:post._id}).populate('reportedBy')
        const subGreddit = await SubGreddit.findOne({ _id: post.postedIn }).populate('followers')
        const result = subGreddit.blockedUsers.find(id => id.toString() === post.postedBy._id.toString())
        const mailOptions = {
            from: 'vanshikadhingra1030@gmail.com', // sender address
            to: post.postedBy.email, // list of receivers
            subject: 'Blocked', // Subject line
            text: 'You have been blocked by the moderator of the subGreddiit as you did not follow the community guidelines' // plain text body
          };
          const mailOptions2 = {
            from: 'vanshikadhingra1030@gmail.com', // sender address
            to: report.reportedBy.email, // list of receivers
            subject: 'User has been blocked', // Subject line
            text: 'The user whose post you reported has been blocked' // plain text body
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
          transporter.sendMail(mailOptions2, (error, info) => {
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
        if (result === undefined) {
            subGreddit.blockedUsers.push(post.postedBy._id)

            subGreddit.followers = subGreddit.followers.filter(id => {
                return (id._id.toString() !== post.postedBy._id.toString())
            })
            post.save()
            subGreddit.save()
            res.json(subGreddit.followers)
        }
        else {
            res.status(200).send({ message: 'already blocked' })
        }
    } catch (error) {
        res.status(500).send({ message: 'no reports' })
    }
})


router.delete('/deletePost/:reportId', async (req, res) => {
    try {
        const report = await Report.findOne({ _id: req.params.reportId }).populate('post').populate('reportedBy')
        const subGreddit = await SubGreddit.findOne({ _id: report.reportedIn })
        const post = await Post.findOne({ _id: report.post._id }).populate('postedBy')
        const mailOptions = {
            from: 'vanshikadhingra1030@gmail.com', // sender address
            to: post.postedBy.email, // list of receivers
            subject: 'Post Deleted', // Subject line
            text: 'Your post has been deleted as it contained some text that was inappropriate' // plain text body
          };
          const mailOptions2 = {
            from: 'vanshikadhingra1030@gmail.com', // sender address
            to: report.reportedBy.email, // list of receivers
            subject: 'User has been blocked', // Subject line
            text: 'The user whose post you reported has been blocked' // plain text body
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
          transporter.sendMail(mailOptions2, (error, info) => {
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
        subGreddit.posts = subGreddit.posts.filter(pos => (pos._id.toString() !== post._id.toString()))
        console.log(subGreddit.posts)
        subGreddit.deletes = subGreddit.deletes + 1
        subGreddit.save()
        const post1 = await Post.deleteOne({ _id: report.post._id })
        const result = await Report.deleteOne({ _id: req.params.reportId })
        res.json('deleted')
    } catch (error) {
        res.status(500).send({ message: 'no reports' })
    }
})

router.post('/stats', async (req, res) => {
    try {
        let stats = await SubGreddit.aggregate([
            {
                $match: {
                    subname: "exampleSubGreddit",
                    followers: {
                        $elemMatch: {
                            $gte: new Date("2023-02-01"),
                            $lt: new Date("2023-02-20")
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    followersCount: { $size: "$followers" }
                }
            }
        ])
        res.status(200).json(stats)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.post('/postStats', async (req, res) => {
    try {
        let stats = await Post.aggregate([
            { $match: { postedIn: mongoose.Types.ObjectId(req.body.subGredditId) } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        dayOfYear: { $dayOfYear: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.dayOfYear': 1,
                    '_id.month': 1,
                },
            },
            { $limit: 20 }
        ])
        stats = stats.map((item) => {
            const { _id: { year, dayOfYear, month }, count } = item
            const date = moment().month(month - 1).year(year).dayOfYear(dayOfYear).format('MMM Y DD')
            return { date, count }
        }).reverse()
        const reportVsDeletes = await SubGreddit.findOne({ _id: req.body.subGredditId })
        const repVsdel = {
            reports: reportVsDeletes.reports,
            deletes: reportVsDeletes.deletes,
        }

        let visitors = await Visitor.aggregate([
            { $match: { subGredditId: mongoose.Types.ObjectId(req.body.subGredditId) } },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" },
                        dayOfYear: { $dayOfYear: '$date' },
                    },
                    count: { $sum: 1 },
                }
            },
        ])
        visitors = visitors.map((item) => {
            const { _id: { year, dayOfYear, month }, count } = item
            const date = moment().month(month - 1).year(year).dayOfYear(dayOfYear).format('MMM Y DD')
            return { date, count }
        }).reverse()

        res.status(200).json({ stats, repVsdel, visitors })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.post('/clicks', async (req, res) => {
    try {
        const visitor = new Visitor({
            clickCount: 1,
            subGredditId: req.body.subGredditId,
        });
        visitor.save()
        res.json(visitor)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.post('/ignore', async (req, res) => {
    try {
        const report = await Report.findOne({ _id: req.body.id })
        report.ignore = true
        report.save()
        res.json(true)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.post('/comment', async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.body.postId })
        if (!req.body.comment) {
            return res.json('Comment cannot be empty')
        }
        post.comments.push({ text: req.body.comment })
        post.save()
        res.json('commented')
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})


export default router