const express=require("express")
const router=express.Router()
const {signup,login,updateProfile,logout,staffuser,manageruser,adminuser,removeuser}=require('../controller/authcontroller')
const {authmiddleware,adminmiddleware,managermiddleware,authorizeRoles}=require('../middleware/Authmiddleware')






router.post("/signup",signup)
router.post("/login",login)
router.delete("/removeuser/:UserId",authmiddleware,authorizeRoles("admin"),removeuser)
router.get("/staffuser",authmiddleware,authorizeRoles("admin"),staffuser)
router.get("/manageruser",authmiddleware,authorizeRoles("admin"),manageruser)
router.get("/adminuser",authmiddleware,authorizeRoles("admin"),adminuser)
router.post("/logout",authmiddleware,logout)
router.put("/updateProfile",authmiddleware,updateProfile)









module.exports=router
