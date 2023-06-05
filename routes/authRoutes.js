import express from 'express'
const router=express.Router()
import { StatusCodes } from "http-status-codes"
import User from '../models/User.js';
import auth from '../middleware/authorisation.js';
import Followers from '../models/Followers.js';
import Following from '../models/Following.js';

router.post('/register',async (req, res) => {
    try {
        const user = await User.create(req.body)
    const token = user.createJWT()
    res.status(StatusCodes.CREATED).json({
        user: {
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            email: user.email,
            age: user.age,
            contactNumber: user.contactNumber,
        },
        token
    })   

    const followers=new Followers({
        userId:user._id
    })
    followers.save()
    const following=new Following({
        userId:user._id
    })
    following.save()
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: error.message });
    }
})

router.post('/login',async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        const e=new Error('please provide values for all fields',StatusCodes.BAD_REQUEST)
        e.name="fieldError"
        throw e
    }
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
        const e=new Error('invalid credentials',StatusCodes.BAD_REQUEST)
        e.name="invalidCredentials"
        throw e
    }

    const isCorrect = await user.comparePassword(password);
    if (!isCorrect) {
        const e=new Error('wrong password',StatusCodes.BAD_REQUEST)
        e.name="wrongPassword"
        throw e
    }
    const token = user.createJWT()
    user.password = undefined
    res.status(StatusCodes.OK).json({
        user, token
    })
})

router.patch('/updateUser',auth,async (req, res) => {
    const { email, firstname, lastname, username, age, contactNumber } = req.body
    if (!email || !firstname || !lastname || !username || !age || !contactNumber) {
        const e=new Error('please provide values for all fields',StatusCodes.BAD_REQUEST)
        e.name="fieldError"
        throw e
    }
    try {
        const user = await User.findOne({ _id: req.user.userId });
        user.email = email
        user.firstname = firstname
        user.lastname = lastname
        user.username = username
        user.age = age
        user.contactNumber = contactNumber
        await user.save()
        const token = user.createJWT()
        res.status(StatusCodes.OK).json({ user, token })   
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: error.message });
    }
})

export default router