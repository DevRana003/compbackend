import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const genrateTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        
        return {refreshToken,accessToken}
    } catch (error) {
        throw new ApiError(500, error.message||"error in generate token method");
    }

}

const registerUser = asyncHandler(async(req,res)=>{

    // get details from user
    // valid or not 
    // user exists or not 
    // avatar is there or not 
    // upload to cloudinary
    // check whether getting right url from cloudinary or not 
    // create user object that 
    // remove password and response token to send to front end ;

    const{fullName , email , username , password} = req.body;
    
    if([fullName , email , username , password].some((field)=>field?.trim()===""))
    {
        throw new ApiError(400,"All fields are required");
    }

    const alreadyexist = await User.findOne({
        $or:[{username},{email}]
    })

    if(alreadyexist) throw ApiError(402,"useralready existed");

    const avatarlocalpath = req.files?.avatar[0]?.path;
    const coverImagelocalpath = req.files?.coverImage[0]?.path;

    console.log(req.files);

    if(!avatarlocalpath) throw new ApiError(400, "avatar image is required");

    const avatar = await uploadoncloudinary(avatarlocalpath);
    const coverImage = await uploadoncloudinary(coverImagelocalpath);

    if(!avatar) throw new ApiError(500, "error at server side uploading on cloudinary")

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage ? coverImage.url : null,
        username, 
        email,
        password
    })

    const createduser = await User.findById(user._id).select("-password -refreshToken")

    if(!createduser) throw new ApiError(500 , "error occur while uploading data to atlas server")

    return res.status(201).json(
        new ApiResponse(200,createduser,"user created successfully")
    )

})

const loginUser = asyncHandler(async(req,res)=>{    
    const {email , username , password} = req.body;

    if(!username && !email )
    {
        throw new ApiError(400,"username or email is required ")
    }

    const user = await User.findOne({$or:[{email},{username}]});
    console.log(user._id);
    if(!user) throw new ApiError(404,"user does not exist");

    const ispassvalid = await user.isPasswordcorrect(password)
    if(!ispassvalid) throw new ApiError(401,"invalid password")

    const {refreshToken , accessToken} = await genrateTokens(user._id);

    const loggedinuser = await User.findOne(user._id).select("-password");

    const options = {
        httpOnly:true,
        Secure : true,
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{user:loggedinuser,accessToken,refreshToken},"user logged in successfully"))

})

const  logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{refreshToken:1}
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly:true,
        Secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{

    try {
        const incomingtoken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingtoken) throw new ApiError(400,"Incoming token not found");
    
        const decodedtoken = jwt.verify(incomingtoken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedtoken._id);
    
        if(!user) throw new ApiError(400, "user with decoded token not found");
    
        if(incomingtoken!==user.refreshToken) throw new ApiError(400, " token do not match ")
    
        const{refreshToken,accessToken } = await genrateTokens(user._id)
        console.log(refreshToken)
        console.log(accessToken)
        const options = {
            httpOnly:true,
            Secure: true
        }
    
        return res.status(200)
        .cookie("accesstoken",accessToken,options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200,{accessToken ,refreshToken},"access token refreshed successfully"))
    } catch (error) {
        throw new ApiError(400,"error in the updating token of try catch ")
    }

})

const changeUserPassword = asyncHandler(async(req,res)=>{
    const {oldPassword , newPassword} = req.body

    const user = User.findById(req.user?._id)
    const isPasswordcorrect = await user.isPasswordcorrect(oldPassword)
    if(!isPasswordcorrect) throw new ApiError(400,"password is not correct")

    user.password = newPassword;
    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(new ApiResponse(200,{},"password changed successfully")) 

})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"current user fetched")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName , email } = req.body
    if(!fullName||!email)
    {
        throw new ApiError(400,"full name or email")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName , 
                email
            }
        },
        {new:true}
        ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200, user , "Account details updated successfully "))
    

})

const changeUseravatar = asyncHandler(async(req,res)=>{

    const avatarlocal = req.user?.avatar

    const newAvatar = req.file.avatar

    if(!newAvatar) throw new ApiError(400, "no new avatar found");

    const avatar = await uploadoncloudinary(newAvatar)

    if(!avatar) throw new ApiError(400,"no response from cloudinary while uploading new avatar")

    const user = User.findByIdAndUpdate(req.user?._id,{$set:{avatar:avatar.url}},{new:true}).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200,{user},"successfull changed avatar"))
})

const changeUserCover = asyncHandler(async(req,res)=>{

    const coverlocal = req.user?.avatar

    const newCover = req.file.avatar

    if(!newCover) throw new ApiError(400, "no new cover found");

    const coverImage = await uploadoncloudinary(newCover)

    if(!coverImage) throw new ApiError(400,"no response from cloudinary while uploading new coverImage")

    const user = User.findByIdAndUpdate(req.user?._id,{$set:{coverImage:coverImage.url}},{new:true}).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200,{user},"successfull changed CoverImage"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const { username } = req.params

    if(username?.trim()) throw new ApiError(400 , "username is not there in getuserchannelprofile")

    const channel = await User.aggregate([
        {
            $match:{
                username:username.toLowerCase()
            }   
        },
        {
            $Lookup: {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"  
            }
        },
        {
            $Lookup:{
                from :"subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscriberscount :{
                    $size: "$subscribers"
                },
                channelsubscribed : {
                    $size:"$subscribedTo"
                },
                issubscribed:{
                    $cond: {
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]}
                    }
                }
            }
        },
        {
            $project:{
                username :1,
                subscriberscount:1,
                channelsubscribed:1,
                issubscribed:1,
                avatar:1,
                coverImage:1,
                email:1,
                fullName:1
            }
        }
    ])

    if(!channel?.length) throw new ApiError(400 , "no channel found mean no user found of this ")

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"succefully calculated subscriber and subscribedTo"))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[{
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            }]
                        }
                    },
                    {
                        $addFields:{
                            owner:{$first:"$owner"}
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,user[0].watchHistory, " watch history fetched "))
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserPassword,
    getCurrentUser,
    updateAccountDetails,
    changeUseravatar,
    changeUserCover,
    getUserChannelProfile,
    getWatchHistory
}           