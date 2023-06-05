import { StatusCodes } from "http-status-codes"

const errorHandlerMiddleware=(err,req,res,next)=>{
    const defaultError={
        statusCode:StatusCodes.INTERNAL_SERVER_ERROR,
        msg:'Something went wrong, try again later'
    }
    if(err.name==='ValidationError'){
        defaultError.statusCode=StatusCodes.BAD_REQUEST
        defaultError.msg=Object.values(err.errors)
        .map((item)=>item.message)
        .join(',')
    }
    if(err.name==='authenticationError'){
        defaultError.statusCode=StatusCodes.UNAUTHORIZED
        defaultError.msg=`user unauthenticated`
    }
    if(err.name==='invalidCredentials'){
        defaultError.statusCode=StatusCodes.BAD_REQUEST
        defaultError.msg=`invalid credentials`
    }
    if(err.name==='wrongPassword'){
        defaultError.statusCode=StatusCodes.BAD_REQUEST
        defaultError.msg=`wrong password`
    }
    if(err.name==='fieldError'){
        defaultError.statusCode=StatusCodes.BAD_REQUEST
        defaultError.msg=`please provide values for all fields`
    }
    if(err.code&&err.code===11000)
    {
        defaultError.statusCode=StatusCodes.BAD_REQUEST
        defaultError.msg=`${Object.keys(err.keyValue).join(',')} field has to be unique`
    }
    res.status(defaultError.statusCode).json({msg:defaultError.msg})
    console.log(err)
}

export default errorHandlerMiddleware