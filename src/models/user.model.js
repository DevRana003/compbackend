import mongoose , {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
const userSchema = new Schema(
    {
        username: {
            type: String,
            required : true,
            unique : true,
            lowercase: true,
            trim : true,
            index: true
        },
        email: {
            type: String,
            required : true,
            unique : true,
            lowercase: true,
            trim : true,
        },
        fullName: {
            type: String,
            required : true,
            trime : true,
            index: true
        },
        avatar:{
            type: String,
            require: true
        },
        coverImage:{
            type:String
        },
        watchHistory : [
            {
                type: Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String,
            required : [true , 'Password is required ']
        },
        refreshToken:{
            type: String
        }
    },
    {
        timestamps: true
    }
)
//pre is for running this particular hook before saving the data of model 
userSchema.pre("save",async function (next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10)
    next()
})
// this is for checking that the encrypted password and password are same 
userSchema.methods.isPasswordcorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}
//these are custom methods made for the generation of the Access Token
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this.id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
//these are custom methods made for the generation of the Refresh Token
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id:this.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User = mongoose.model("User",userSchema)