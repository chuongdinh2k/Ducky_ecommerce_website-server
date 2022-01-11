import express from "express";
import { verifyToken } from "../middleware/auth.js";
import BlogModel from "../models/blog.js";
import upload from "../untils/multer.js";

import cloudinary from "../untils/cloudinary.js";

const blogRouter = express.Router();

// @route api/blog/upload
// private router
blogRouter.post("/userBlog/upload",verifyToken,upload.array("images",5),async(req,res)=>{
    let content = req.body.content;
    let status = req.body.status || "";
    let selling = req.body.selling || "";
    let checkIn = req.body.checkIn || "";
    try{
        let imageFiles = req.files;
        if(imageFiles){
            let multipleImagesPromises = imageFiles.map((image) =>
            cloudinary.v2.uploader.upload(image.path)
            );
            // await all the cloudinary upload functions in promise.all
            let imageResponses = await Promise.all(multipleImagesPromises);
            if(!imageResponses){return res.status(400).json({message:"Something wrong while uploading image!"})};
            const listImages = imageResponses.map(item=>{
                return {"link":item.secure_url}
            });
            let newBlog = new BlogModel({
                user:req.user._id,
                content,
                status,
                checkIn,
                selling,
                images:listImages
            })
            newBlog.save(function(err,blog){
                blog.populate([
                        {path:'user',select:'_id username picture '},
                        {path:'userLikes.user',select:'_id username picture'},
                        {path:'userLikes.user',select:'_id username picture'}
                    ])
                    .then(function(blog){
                            return res.status(200).json(blog);
                        })
    
            }); 
        }
       else{
        let newBlog = new BlogModel({
            user:req.user._id,
            content,
            status,
            checkIn,
            selling
            // images:listImages
        })
        newBlog.save(function(err,blog){
            blog.populate([
                    {path:'user',select:'_id username picture '},
                    {path:'userLikes.user',select:'_id username picture'},
                    {path:'userLikes.user',select:'_id username picture'}
                ])
                .then(function(blog){
                        return res.status(200).json(blog);
                    })

        }); 
       }
            //  const blog = await newBlog.populate({path:'user',select:'_id username picture '})
            //                         .populate({path:'comments.user',select:'_id username picture'})
            //                         .populate({path:'userLikes.user',select:'_id username picture'});
            //  return res.status(200).json(blog);
    }
    catch (err) {
        res.status(500).json({ message: `Internal Server Error: ${err}` });
      }
});
// @router api/blog/profile
blogRouter.get("/userBlog/:id",async(req,res)=>{
    const id = req.params.id || "";
    const filterId= id=="undefined"?{}:{user:id};
    const limit = Number(req.query.limit);
    const page = Number(req.query.page) || 1;
    
    try{
        const blogs = await BlogModel.find({...filterId}).populate({path:'user',select:'_id username picture'})
                                              .populate({path:'comments.user',select:'_id username picture'})
                                              .populate({path:'userLikes.user',select:'_id username picture'})
                                              .sort({updatedAt:-1})
                                              .skip(limit*(page-1))
                                              .limit(limit);
        return res.status(200).json({blogs});
    }
    catch(err){
        res.status(500).json({ message: `Internal Server Error: ${err}` });
    }
})
// @router api/blog/like
blogRouter.post("/userBlog/like",verifyToken,async(req,res)=>{
    const {id} =  req.body;
    try{
        let post = await BlogModel.findById({_id:id});
        if(!post){return res.status(400).json({message:"Post is not exist anymore!"})}; 
        let postIndex = post.userLikes.findIndex((x)=>x.user == req.user._id);
        if(postIndex<0){
            post.userLikes.push({user:req.user._id});
            post = await post.save();
        }
        else{
            let userLikes = post.userLikes.filter(x=>x.user!=req.user._id);
            post.userLikes = userLikes;
            await post.save();
        }
        post =  await post.populate({path: 'userLikes.user',select: '_id username picture'});
        return res.status(200).json(post);
        // return res.status(200).json(post);
    }
    catch(err){
        res.status(500).json({ message: `Internal Server Error: ${err}` });

    }

})
//comment post
blogRouter.post("/userBlog/comment",verifyToken,upload.single('image'),async(req,res)=>{
    const {content,id} = req.body;
    try{
        let post = await BlogModel.findById({_id:id});
        if(!post){return res.status(404).json({message:"Post not found!"})};
        let imageFile = req.file;
        let comment = {
            user: req.user._id,
            content
        }
        // if comment doesnt without image
        if(!imageFile){
            post.comments.push(comment);
            // await post.save();
        }
        // comment contains an image
       else{
            const result = await cloudinary.v2.uploader.upload(req.file.path);
            if (!result) {
                return res.status(400).json({ message: "wrong image!" });
            }
            comment = {
                ...comment,
                image:result.secure_url
            }
            post.comments.push(comment);
       }
        await post.save();

        post = await post.populate({path:'comments.user',select:'_id username picture'});
        return res.status(200).json(post)
    }
    catch(err){
        res.status(500).json({ message: `Internal Server Error: ${err}` });
    }
})

//delete post 
blogRouter.delete("/userBlog/delete",verifyToken,async(req,res)=>{
    const {id} = req.body;
    const userId = req.user._id;
    try{
        const blog = await BlogModel.findById({_id:id});
        if(!blog){
            return res.status(404).json({message:'Post does not exist'});
        }
        else{
            if(userId!=blog.user) return res.status(400).json({message:'You dont have permision to delete this post!'});
            BlogModel.deleteOne({ _id:id }, function(err, result) {
                if (err) {
                  return  res.status(500).json({ message: `Error: ${err}` });
                } else {
                  return res.status(200).json(result);
                }
              });
        }
    }
    catch(err){
        return res.status(500).json({ message: `Internal Server Error: ${err}` });
    }

})
export default blogRouter;