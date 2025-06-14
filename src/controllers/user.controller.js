import {asyncHandler} from"../utils/asyncHandler.js";
import {User}from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"

import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler ( async(req, res)=>{
    console.log("req.files:", req.files);
     const {fullName, email, username, password}= req.body;
    console.log("REQ.BODY:", req.body);
    console.log("Extracted values:", { fullName, email, username, password });

    if (
        [fullName, email, username, password].some((field)=> field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
        
    }


    console.log("Uploading avatar from:", avatarLocalPath);
    console.log("Uploading coverImage from:", coverImageLocalPath);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        //console.log("avatar path:", req.files?.avatar?.[0]?.path);
        throw new ApiError(400, "Avatar file is required")
    }

   const newUser = await User.create ({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(newUser._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        //console.log("coverImage path:", req.files?.coverImage?.[0]?.path);
        throw new ApiError (500 , "something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered succesfully")
    )

})

export {registerUser,}