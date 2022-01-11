import mongoose from "mongoose";
const followingSchema = new mongoose.Schema(
    {
        user:{type:String,ref:"User",requred:true}
    }
)
const followerSchema = new mongoose.Schema(
    {
        user:{type:String,ref:"User",requred:true}
    }
)
const user = new mongoose.Schema(
    {
        username:{type: String,required: true},
        email:{type: String,required: true},
        picture:{type:String,required: false},
        isAdim:{type:Boolean,default:false},
        password:{type:String,required:true},
        address:{type:String},
        city:{type:String},
        country:{type:String},
        ageBorned:{type:String},
        phoneNumber:{type:String},
        about:{type:String},
        following:[followingSchema],
        follower:[followerSchema]
    },
    {
        timestamps: true,
    }
);
export const UserModel = mongoose.model("User",user);