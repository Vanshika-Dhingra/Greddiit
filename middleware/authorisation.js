import { StatusCodes } from "http-status-codes"
import jwt from 'jsonwebtoken'

const auth = async(req,res,next)=>
{
    const authHeader=(req.headers.authorization)
    if(!authHeader||!authHeader.startsWith('Bearer'))
    {
        console.log('1')
        const e=new Error('authentication error',StatusCodes.UNAUTHORIZED)
        e.name="authenticationError"
        throw e
    }
    const token =authHeader.split(' ')[1]
    try {
        console.log('2')
        const payload=jwt.verify(token,process.env.JWT_SECRET)
        req.user=payload
        //next()
    } catch (error) {
        const e=new Error('authentication error',StatusCodes.UNAUTHORIZED)
        e.name="authenticationError"
        throw e
    }
    next()
}

export default auth