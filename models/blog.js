import mongoose from "mongoose";
const listImages = new mongoose.Schema(
    {
        link:{type:String}
    }
)
const listComments =  new mongoose.Schema(
    {
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        content:{type:String,required:true},
        image:{type:String}
        
    },
    {
        timestamps: true,
    }
)
const userLikes = new mongoose.Schema(
    {
        user:{type: mongoose.Schema.Types.ObjectId,
            ref: "User"}
    }
)
const userTag = new mongoose.Schema(
    {
        user:{type: mongoose.Schema.Types.ObjectId,
            ref: "User"}
    }
)
const blogSchema = new mongoose.Schema(
    {
        user:{ type: mongoose.Schema.Types.ObjectId,
            ref: "User"},
        content:{type:String,required:true},
        status:{type:String},
        images:[listImages],
        tag:[userTag],
        userLikes:[userLikes],
        comments:[listComments],
        checkIn:{type:String},
        selling:{type:String}
    },
    {
        timestamps: true,
    }
)
const BlogModel = mongoose.model("Blog", blogSchema);
export default BlogModel;