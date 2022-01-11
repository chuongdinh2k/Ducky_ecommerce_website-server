import express from "express";
import {OAuth2Client} from 'google-auth-library';
import { UserModel } from "../models/user.js";
import OrderModel from "../models/order.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/auth.js";
import upload from "../untils/multer.js";
import cloudinary from "../untils/cloudinary.js";

const client = new OAuth2Client(process.env.CLIENT_ID);
const router = express.Router();


// @route POST api/auth/loginWithGoogle
// @desc google login 
// @access Public
router.post("/loginWithGoogle",async(req, res) => {
    const { token }  = req.body;
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.CLIENT_ID
    });
    const { name, email, picture,email_verified } = ticket.getPayload(); 
    try{
        const user =  await UserModel.findOne({email});
        //if(user login with google account before)
        if(user){
            const token = jwt.sign({_id:user._id,username:user.username,isAdmin:user.isAdmin,email:user.email,picture:user.picture},
                                    process.env.JWT_SIGNIN_KEY,{expiresIn:'7d'});
          

            return res.status(200).json({
              id:user._id,
              name:user.username,
              email:user.email,
              picture: user?.picture,
              isAdmin: user.isAdmin,
              address: user?.address,
              city: user?.city,
              country: user?.country,
              phoneNumber: user?.phoneNumber,
              about:user?.about,
              token
             });                        
        }
        //if user login with google account at the first time
        const hashedPassword = await argon2.hash(email+process.env.JWT_SIGNIN_KEY);
        const newUser = UserModel({
            username:name,
            email,
            password:hashedPassword,
            picture
        });
        const createdUser = await newUser.save();
        const token = jwt.sign({_id:createdUser._id,username:createdUser.username,isAdmin:createdUser.isAdmin,email:createdUser.email,picture:createdUser.picture},
            process.env.JWT_SIGNIN_KEY,{expiresIn:'7d'});
        return res.status(200).json({
              token,
                id: createdUser._id,
                name: createdUser.username,
                email: createdUser.email,
                isAdmin: createdUser.isAdmin,
                picture: createdUser.picture
        });

    }
    catch(error){
        console.log(error);
        res.status(500).json({
            message:`Internal Server Error ${error.message}`
        });
    }

})

//@route Register api/auth/register
//@desc Register
//@access Public
router.post("/register",async(req,res)=>{
        const { username,email,password,country} = req.body;
        try {
          const user = await UserModel.findOne({ email });
          if (user)
            return res
              .status(400)
              .json({ success: false, message: "Email already taken" });
          //all good
          const hashedPassword = await argon2.hash(password);
          const newUser = new UserModel({
            username,
            email,
            password: hashedPassword,
            country,
            isAdmin:false,
            picture:null,
          });
          await newUser.save();
          return res.status(200).json({success:true,message:"You've just register an account, let login now!"})
        
        } catch (error) {
          console.log(error);
          res.status(500).json({
            success: false,
            message: `Internal Sever Error ${error.message}`,
          });
        }
      });

// @route POST api/auth/login
// @desc login user
// @access Public
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      //check existing user
      const user = await UserModel.findOne({email});
      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user or password!" });
      }
      const passwordValid = await argon2.verify(user.password, password);
      if (!passwordValid) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user or password!" });
      }
      //All good
      //Return token
       const token = jwt.sign({_id:user._id,username:user.username,isAdmin:user.isAdmin,email:user.email,picture:user.picture},
            process.env.JWT_SIGNIN_KEY,{expiresIn:'1d'});     
      res.json({
        id:user._id,
        name:user.username,
        email:user.email,
        picture: user?.picture,
        isAdmin: user.isAdmin,
        address: user?.address,
        city: user?.city,
        country: user?.country,
        phoneNumber: user?.phoneNumber,
        about:user?.about,
        token
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ success: false, message: `Internal Server Error ${err}` });
    }
  });

//@route post api/user/changePassword
//@change password
router.post('/user/changePassword',verifyToken,async(req,res)=>{
    const {oldPassword,newPassword} = req.body;
    const id = req.user._id
    try{
      const user = await UserModel.findById({_id:req.user._id});
      if(!user){
        return res.status(404).json({message: "User not found"});
      }        
      const passwordValid = await argon2.verify(user.password,oldPassword);
      if(!passwordValid){return res.status(400).json({message:"Your old password is incorrect!"})};
      // all good
      const hashedPassword = await argon2.hash(newPassword);
       await UserModel.findByIdAndUpdate(id,{password:hashedPassword});
      return res.status(200).json({success:true,message:"Changed password successfully!"});
      }
    catch(err){
      res.status(500).json({ success: false, message: `Internal Server Error ${err}` });
    }
});


//@route post api/user/update
//@update user profile
router.post('/user/update',verifyToken, upload.single("image"),async(req,res)=>{
  const id = req.user._id;
  const {username,address,city,country,phoneNumber,about,token} = req.body;
  try{
    //  let user = await UserModel.findById({_id:id});
    //  if(!user){return res.status(404).json({message: "User not found"})};
    //  user = {
    //    ...user,
    //    username,
    //    address,
    //    city,
    //    country,
    //    phoneNumber
    //  }
    //   user = await user.save();
    // return res.status(200).json(user);
    let update = { username: username,address:address,city:city,country:country,phoneNumber:phoneNumber,about:about };
    let imageFile = req.file;
    if(imageFile){
      const result = await cloudinary.v2.uploader.upload(req.file.path);
      if (!result) {
        return res.status(500).json({ message: "something is wrong with uploading image!" });
      }
      update = {
        ...update,
        picture:result.secure_url
        
      }
    }
    const updatedUser = await UserModel.findByIdAndUpdate(id,update, 
      { upsert: true,
        new: true },
      // function(err,doc){
      //   if(err) return res.json(err);
      //   else{return res.status(200).json(doc)}
      // }
      );
    return res.status(200).json(
      {
        id:updatedUser._id,
        name:updatedUser.username,
        email:updatedUser.email,
        picture: updatedUser.picture,
        isAdmin: updatedUser.isAdmin,
        address: updatedUser.address,
        city: updatedUser.city,
        country: updatedUser.country,
        phoneNumber: updatedUser.phoneNumber,
        about:updatedUser.about,
        token:token
      }
      );
  }
  catch(err){
    res.status(500).json({ success: false, message: `Internal Server Error ${err}` });

  }

})

//@route get api/user/sum;
//@desc get own product
router.post('/user/follow',verifyToken,async(req,res)=>{
  const {id} = req.body;
  try{
    let user = await UserModel.findById({_id:id});
    if(!user){
      return res.status(400).json({message:"user is not found!"});
    }
    const getIndex = user?.follower.findIndex((x)=>x.user==req.user._id);
    // return res.json(getIndex);
    if(getIndex<0){
      //my following
      let mine = await UserModel.findById({_id:req.user._id});
      const myFollowing={user:id};
      mine.following.push(myFollowing);
      await mine.save();
      // target account list follower
      const follower={user:req.user._id};
      user.follower.push(follower);
      await user.save(function(err,user){
        user.populate([
                {path:'follower.user',select:'_id username picture '},
                {path:'following.user',select:'_id username picture '}
            ])
            .then(function(user){
                    return res.status(200).json(user);
                })

       });    
    }
    // unfollow
    else{
      //my following
      let mine = await UserModel.findById({_id:req.user._id});  
      let listMyFollowing = mine?.following.filter(x=>x.user!=id);
      mine.following = [...listMyFollowing];
      await mine.save();
      // target account list follower
      let listFollowers = user?.follower.filter(x=>x.user!=req.user._id);
      user.follower = listFollowers;
      await user.save(function(err,user){
        user.populate([
                {path:'follower.user',select:'_id username picture '},
                {path:'following.user',select:'_id username picture '}
            ])
            .then(function(user){
                    return res.status(200).json(user);
                })

       });     }
  }
  catch (err) {
    res.status(500).json({ success: false, message: `Internal Server Error ${err}` });
  }
})

//@route get api/user/sum;
//@desc get own product
// router.get("/sumProduct",async(req,res)=>{
//   const {id} = req.body;
//   try{
//     const result = await OrderModel.aggregate([
//       {$match : { "user":id }},
//       {$group:{
//         _id:"$user",
//         totalAmount:{$sum:"$totalPrice"},
//         count:{$sum:1}
//       }}
//     ]);
//     return res.status(200).json(result);

//   }
//   catch (err) {
//     console.log(err);
//     res.status(500).json({ success: false, message: `Internal Server Error ${err}` });
//   }
// })

// @route api/auth/user/viewProfile

router.post("/user/viewProfile",async(req,res)=>{
  const {id} = req.body;
  try{
    const user = await UserModel.findById({_id:id}).populate({path:"following.user",select:"_id username picture city"})
                                                    .populate({path:"follower.user",select:"_id username picture city"});
    if(!user){
      return res.status(404).json({message:"User not found!"});
    }
    return res.status(200).json(user);

  }
  catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Internal Server Error ${err}` });
  }
})
export default router;