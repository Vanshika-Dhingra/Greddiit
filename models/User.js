import mongoose from "mongoose";
import validator from "validator";
import bycrypt from "bcryptjs"
import jwt from 'jsonwebtoken'

const UserSchema=new mongoose.Schema({
    firstname:{
        type:String,
        required:[true,'please provide name'],
        minlength:3,
        maxlenght:20,
        trim:true,
    },
    lastname:{
        type:String,
        maxlenght:20,
        trim:true,
        default:'lastname'
    },
    username:{
        type:String,
        maxlenght:20,
        trim:true,
        required:[true,'please provide username']
    },
    email:{
        type:String,
        required:[true,'please provide email'],
        unique:true,
        validate:{
            validator:validator.isEmail,
            message:'please provide a valid email'
        }
    },
    age:{
        type:String,
        required:[true,'please provide age'],
    },
    contactNumber:{
        type:String,
        validate:{
            validator:validator.isMobilePhone,
            message:'please provide a valid phone number'
        },
        required:[true,'please provide contact number']
    },
    password:{
        type:String,
        required:[true,'Please Provide password'],
        minlength:6,
        select:false,
    },
    banned: { 
        type: Boolean,
        default: false 
    },
    savedPosts: [{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Post'
      }],
})

UserSchema.pre('save',async function(){
    if(!this.isModified('password'))return 
    const salt=await bycrypt.genSalt(10);
    this.password = await bycrypt.hash(this.password,salt)
})

UserSchema.methods.createJWT=function(){
    return jwt.sign({userId:this._id,name:this.firstname},process.env.JWT_SECRET,{expiresIn:process.env.JWT_LIFETIME})
}

UserSchema.methods.comparePassword = async function(candidatePassword){
    const isMatch=bycrypt.compare(candidatePassword,this.password);
    return isMatch
}

export default mongoose.model('User',UserSchema)