import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    
})

export { registerUser }       