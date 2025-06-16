import {asyncHandler} from"../utils/asyncHandler.js";
import {User}from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"

import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return{accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access token")
    }
}

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

const loginUser = asyncHandler(async (req, res) => {
  let { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  if (username) username = username.toLowerCase();
  if (email) email = email.toLowerCase();

  const user = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const LoggedInUser = await User.findById(user._id).
    select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status (200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: LoggedInUser , accessToken,refreshToken
            },
            "User Logged in Successfully"
        )
    )
    
})

const logoutUser = asyncHandler(async(req, res)=> {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler (async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")

    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
         if (!user) {
            throw new ApiError(401, "invalid refresh token")
    
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("resfreshToken",newRefreshToken , options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})
   
    

export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}

