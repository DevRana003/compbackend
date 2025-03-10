import { Router } from "express";
import { registerUser , loginUser, logoutUser , refreshAccessToken, changeUserPassword, getCurrentUser, updateAccountDetails, changeUseravatar, changeUserCover, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyjwt} from "../middlewares/auth.middleware.js"
const router = Router();
router.route("/register").post
(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)

// secured routes 

router.route("/logout").post(verifyjwt,logoutUser)
router.route("/refresh-route").post(refreshAccessToken)
router.route("/change-password").post(verifyjwt,changeUserPassword)
router.route("/current-user").post(verifyjwt,getCurrentUser)
router.route("/update-account").patch(verifyjwt,updateAccountDetails)
router.route("/updateavtar").patch(verifyjwt,upload.single("avatar"),changeUseravatar)
router.route("/updatecoverImage").patch(verifyjwt,upload.single("coverImage"),changeUserCover)
router.route("/c/:username").get(verifyjwt,getUserChannelProfile)
router.route("/history").get(verifyjwt,getWatchHistory)

export default router