import express from "express";
import { verifyToken } from "../middleware/auth.js";
import ProductModel from "../models/product.js";
import OrderModel from "../models/order.js";
import CartModel from "../models/cart.js";
const orderRouter = express.Router();

// @route post api/order/
// @desc order 

orderRouter.post('/',verifyToken,async(req,res)=>{
    const {
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        shippingMethod,
        shippingPrice,
        totalPrice
    } = req.body;

    try{
        const order = new OrderModel({
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingMethod,
            shippingPrice,
            isPaid:false,
            isDeliverd:false,
            totalPrice,
            user:req.user._id
        });
        if(orderItems.length==0){return res.status(500).json({message:"Your cart is empty!"})};
        const createOrder = await order.save();
         await CartModel.findOneAndDelete({userId:req.user._id});
     
        orderItems.forEach(async(item,i) =>{
            const product = await ProductModel.findOne({_id:item.itemId},
                function(err,obj) { console.log(err)}
                ).clone();
             await ProductModel.updateOne({_id:item.itemId},
                {$set:{"countInStock":product.countInStock-item.quantity,
                        "sold":product.sold + item.quantity            
            }});
           
        })

        return res.status(200).json({order:createOrder});
    }
    catch(err){
        res.status(500).json({ message: `Internal server error: ${err.message}` });
    }
})

// @route post api/order/
// @desc order 
orderRouter.get('/mine',verifyToken,async(req,res)=>{
    try{
        const order =await OrderModel.find({user:req.user._id}).populate({path:"orderItems.itemId",select:'sellerId email sellerName'});
        return res.status(200).json({order})
    }
    catch(err){
        return res.status(500).json({ message: `Internal server error: ${err.message}` });
    }
})

export default orderRouter;