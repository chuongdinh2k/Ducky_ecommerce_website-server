import mongoose from "mongoose";
const cartSchema = new mongoose.Schema(
    {
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        products:[
            {
                name: { type: String, required: true },
                color:{ type: String, required: true},
                image:{type:String, required: true},
                price:{type:Number, required: true},
                quantity:{type:Number,required:true},
                size:{type:Number,required:true},
                available:{type:Number,required:true},
                itemId:{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    require: true,
                },
                seller:{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                // sellerName:{ type: String, ref: "User", required: true },
                total:{type:Number,required: true}
            }
        ]
    }
)
const CartModel = mongoose.model("cart",cartSchema);
export default CartModel;