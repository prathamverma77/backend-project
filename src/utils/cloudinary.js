import {v2 as cloudinary} from "cloudinary"

import fs from "fs"



    // Configuration
 cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
});

 // Upload an image
 
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload
        (localFilePath,{
            resource_type: "auto"
        })
        console.log("file is uploaded oncloudinary",response.url);
        return response;
        
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
}

export{uploadOnCloudinary}