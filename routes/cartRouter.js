import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import CartModel from "../models/cart.js";
import ProductModel from "../models/product.js";
const cartRouter = express.Router();

// @route get api/cart/mine
// @desc get customer's list items in cart

cartRouter.get("/mine",verifyToken,async(req,res)=>{
    const userId = req.user._id;
    try{
        const cart = await CartModel.findOne({userId});
        if(cart){
            res.status(201).json({cart});
        }
        else{
            res.status(200).json({cart:{
                products:undefined
            }})
        }
    }
    catch(err){
        res.status(500).json({ message: `Internal server error: ${err.message}` });
    }
})


// @route post api/cart/addToCart
// @desc add product to card
cartRouter.post("/addToCart",verifyToken,async(req,res)=>{
    const {
        name,
        color,
        image,
        price,
        size,
        itemId,
        seller,
        // sellerName,
        quantity
    } = req.body;
    
    try{
        let cart =  await CartModel.findOne({userId:req.user._id});
        let product = await ProductModel.findOne({_id:itemId});
     if(cart){
         let itemIndex = cart.products.findIndex(item =>item.size == size && item.color == color && item.itemId == itemId);
         if(itemIndex>-1){
             //product exists in the cart, update quantity
             let productItem = cart.products[itemIndex];
             productItem.quantity = quantity + productItem.quantity;
            //  check if quantity in cart greater than quantity in countInStock
             if(productItem.quantity>product.countInStock){
                 productItem.quantity = product.countInStock
             }
             productItem.total = productItem.quantity*productItem.price;
             cart.products[itemIndex] = productItem;
             
         }
         else{
             //product does not exist in cart, add new item
             cart.products.push({name,itemId,color,size,image,price,seller,quantity,total:quantity*price,available:product.countInStock});
         }
         cart = await cart.save();
         return res.status(201).json({cart});


    }
    else{
            //cart for user, create new cart
            const newCart = new CartModel({
                userId: req.user._id,
                products:[
                    {
                        name,
                        color,
                        image,
                        price,
                        size,
                        itemId,
                        seller,
                        // sellerName,
                        quantity,
                        available:product.countInStock,
                        total:quantity*price
                        
                        // available:product.countInStock
                    }
                ]
            });
            const createdCart = await newCart.save();
            return res.status(201).json({cart:createdCart})
        }
 
    }
    
    catch(err){
        res.status(500).json({ message: `Internal server error: ${err.message}` });
    }
});

// @route post api/cart/remove
// @desc icrease item's quantity
cartRouter.post('/increase',verifyToken,async(req,res)=>{
    const {itemId, color, size} = req.body;
    const userId = req.user._id;
    try{
        let cart = await CartModel.findOne({userId});
        if(cart){
            let itemIndex = cart.products.findIndex(iteam =>iteam.itemId == itemId && iteam.size == size && iteam.color == color);
            if(itemIndex>-1){
                //product exists in the cart, update quantity
                let productItem = cart.products[itemIndex];
                productItem.quantity = productItem.quantity+1;
                productItem.total = productItem.quantity*productItem.price;
                cart.products[itemIndex] = productItem;
            }
        }
        cart = await cart.save();
        return res.status(201).json({cart})
    }
    catch(err){
        res.status(500).json({ message: `Internal server error increse: ${err.message}` });
    }
})
// @route post api/cart/remove
// @desc remove cart
cartRouter.post('/decrease',verifyToken,async(req,res)=>{
    const {itemId, color, size} = req.body;
    const userId = req.user._id;
    try{
        let cart = await CartModel.findOne({userId});
        if(cart){
            let itemIndex = cart.products.findIndex(iteam =>iteam.itemId == itemId && iteam.size == size && iteam.color == color);
            if(itemIndex>-1){
                //product exists in the cart, update quantity
                let productItem = cart.products[itemIndex];
                productItem.quantity = productItem.quantity-1;
                productItem.total = productItem.quantity*productItem.price;
                //if quantity = 0 remove item from cart
                if(productItem.quantity==0){
                    let updatedCart = cart.products.filter((p)=>p._id!=productItem._id);        
                    cart.products = updatedCart;
                    cart =  await cart.save();
                    return res.json({cart});
                }
                cart.products[itemIndex] = productItem;
            
            }
            // else{
            //     return res.status(400).json({message:"Can not find item in cart!"});
            // }
        }
        cart = await cart.save();
        return res.status(201).json({cart})
    }
    catch(err){
        res.status(500).json({ message: `Internal server error decrese: ${err.message}` });
    }
})

// @route post api/cart/remove
// @desc remove cart
cartRouter.post('/remove',verifyToken,async(req,res)=>{
    const {_id} = req.body;
    const userId = req.user._id;
    try{
        let cart = await CartModel.findOne({userId});
        if(cart){
            let itemIndex = cart.products.findIndex(iteam =>iteam._id==_id);
            if(itemIndex>-1){
                    let updatedCart = cart.products.filter((p)=>p._id!=_id);        
                    cart.products = updatedCart;
                    cart =  await cart.save();
                    return res.status(201).json({cart});        
            }
            return res.status(400).json({message:"Item not found!"});
        }
        res.status(400).json({message:"cart not found!"});
    }
    catch(err){
        res.status(500).json({ message: `Internal server error decrese: ${err.message}` });
    }
})

export default cartRouter;