import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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

    const loggedinuser = await User.findOne(user._id).select("-password -refreshToken");

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
            $set:{refreshToken:undefined}
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
    
        const decodedtoken = jwt.verify(incomingtoken,REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedtoken._id);
    
        if(!user) throw new ApiError(400, "user with decoded token not found");
    
        if(incomingtoken!==user.refreshToken) throw new ApiError(400, " token do not match ")
    
        const{accessToken, newrefreshToken} = await genrateTokens(user._id)
    
        const options = {
            httpOnly:true,
            Secure: true
        }
    
        return res.status(200)
        .cookie("accesstoke",accessToken,options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(new ApiResponse(200,{accessToken , refreshToken:newrefreshToken},"access token refreshed successfully"))
    } catch (error) {
        throw new ApiError(400,"error in the updating token of try catch ")
    }

})



export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken 
}       