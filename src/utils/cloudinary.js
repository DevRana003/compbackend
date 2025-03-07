
import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

(async function() {
    // Configuration
    cloudinary.config({ 
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
})();

const uploadoncloudinary = async (localfilepath)=>{
    try {
        if(!localfilepath) return null
        //upload the file on the cloudinary 
        const response = await cloudinary.uploader.upload(localfilepath,{
            resource_type:"auto"
        })
        console.log("file is uploaded on cloudinary",response.url);
        fs.unlinkSync(localfilepath)
        return response;
    } catch (error) {
        fs.unlinkSync(localfilepath) // remove the locally saved temp file as the operation got failed 
        return null;
    }
}

export {uploadoncloudinary}  