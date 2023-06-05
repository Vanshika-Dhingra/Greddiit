import express from 'express'
const app=express()
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
dotenv.config()
//db and authenticate user
import connectDB from './db/connect.js'

import 'express-async-errors'
import morgan from 'morgan'
//routers
import authRouter from './routes/authRoutes.js'
import followersFollowingRoutes from './routes/followerRoutes.js'
import subGredditRoutes from './routes/subGredditRoutes.js'

//middleware
import notFoundMiddleware from './middleware/notFound.js'
import errorHandlerMiddleware from './middleware/errorHandler.js'
import auth from './middleware/authorisation.js'

if(process.env.NODE_ENV!=='production')
{
    app.use(morgan('dev'))
}

app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/',(req,res)=>{
    res.json({msg:'Welcome'})
})
app.use('/api/v1/subGreddit',auth,subGredditRoutes)
app.use('/api/v1/auth',authRouter)
app.use('/api/v1/fol', auth,followersFollowingRoutes);

app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

const port=process.env.PORT||8000

// app.listen(port,()=>{
//     console.log(`server is listening on port:${port}...`)
// })

const start=async()=>{
    try {
        await connectDB(process.env.MONGO_URL)
        app.listen(port,()=>{
            console.log(`server  listening on port:${port}...`)
        })
    } catch (error) {
        console.log(error)
    }
}

start()