import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import ProductModel from "../models/product.js";
import upload from "../untils/multer.js";
import cloudinary from "../untils/cloudinary.js";
const productRouter = express.Router();

// @route get api/product/all
// @desc create new product
productRouter.get("/all",async(req,res)=>{
    try{
        const product = await ProductModel.find();
        res.status(200).json({product}); 
    }
    catch(err){
        res.status(500).json({ message: `Internal server error: ${err.message}` });
    }
})

// @route GET api/product/detail/:id
// @desc view detail
productRouter.post("/detail",async(req,res)=>{
    const { _id } = req.body;
    try{
        let product = await ProductModel.findById(_id);
        if (product) {
           product = await product.populate({path:'reviews.user',select:'_id username picture email'}); 
            res.json(product);
        } else {
            res.status(404).json({ message: "Product Not Found" });
        }
    }
    catch (err) {
        res.status(500).json({ message: `Internal Server Error ${err}` });
      }
})

// @route POST api/product/review
// @desc review product item

productRouter.post("/review",verifyToken,async(req, res) => {
    const {_id,comment,rating} = req.body;
    try{
        const product = await ProductModel.findById(_id);
        if(product){
            if(product.reviews.find((x)=>x.user==req.user._id)){
                return res.status(400).json({message:"You aldready submitted  a review"});
            }
            const review ={
                // picture:req.user.picture,
                // userId:req.user._id,
                // name:req.user.username,
                user:req.user._id,
                rating:Number(rating),
                comment:comment
            }
            product.reviews.push(review);
            product.numReviews = product.reviews.length;
            let num = product.reviews.reduce((a, c) => c.rating + a, 0)/product.reviews.length
            product.rating = Math.round(num*2)/2;
            let updatedProduct = await product.save();
            updatedProduct = await updatedProduct.populate({path:"reviews.user",select:'_id username picture email'});
            res.status(201).json({
                product:updatedProduct
            })
        }

    }
    catch (err) {
        res.status(500).json({ message: `Internal Server Error ${err}` });
      }
})


//@route Upload api/product/Upload
productRouter.post("/upload",verifyToken,upload.array("images",10),async(req,res)=>{
    const {name,color,gender,description,category,price,countInStock} = req.body;
    try{
        
        let imageFiles = req.files;
        if(!imageFiles){
            return res.status(400).json({message:"No picture attached!"});
        }
        const product = await ProductModel.findOne({name,gender,sellerId:req.user._id});
        if(product){
            return res.status(400).json({message:"Product is exist!"})
        }
         //map through images and create a promise array using cloudinary upload function
         let multipleImagesPromises = imageFiles.map((image) =>
            cloudinary.v2.uploader.upload(image.path)
        );
         // await all the cloudinary upload functions in promise.all
         let imageResponses = await Promise.all(multipleImagesPromises);
         if(!imageResponses){return res.status(400).json({message:"Something wrong while uploading image!"})};
        //  let listImages = imageResponses.map((image,index)=>image.secure_url);
        const listImages = imageResponses.map(item=>{
            return {"link":item.secure_url}
        })
        let colors= color.map(item=>{
            return{"name":item,hexCode:""}
        })
         const newProduct = new ProductModel({
             name,gender,description,category,price,countInStock,
             color:colors,
             sellerId:req.user._id,
             sellerName:req.user.username,
             numReviews:0,
             rating:5,
             listImage:listImages,
             image:listImages[0].link,
             email:req.user.email,
             sold:0
         })
         const createdProduct = await newProduct.save();
         return res.status(200).json({createdProduct});
    }
    catch (err) {
        res.status(500).json({ message: `Internal Server Error ${err}` });
      }

})

// @route GET api/product/mine
// @desc get my product
productRouter.get("/mine",verifyToken,async(req, res) => {
    try{
        const products =  await ProductModel.find({sellerId:req.user._id});
        return res.status(201).json({products}).sort({createdAt: +1});
    }
    catch (err) {
        return res.status(500).json({ message: `Internal Server Error ${err}` });
      }
})

// @route GET api/product/mine
// @desc get my product
productRouter.get("/filter/:id",async(req, res) => {
    const id = req.params.id;
    const limit = Number(req.query.limit);
    const page = Number(req.query.page) || 1;
    const name = req.query.name || "";
    const color = req.query.color;
    const category = req.query.category || "";
    const min = req.query.min && Number(req.query.min) !== 0 ? Number(req.query.min) : 0;
    const max =
    req.query.max && Number(req.query.max) !== 0 ? Number(req.query.max) : 0;
    const rating =req.query.rating && Number(req.query.rating) !== 0? Number(req.query.rating): 0;
    const priceFilter = min && max ? { price: { $gte: min, $lte: max } } : {};
    const ratingFilter = rating ? { rating: { $gte: rating } } : {};
    const nameFilter = name ? { name: { $regex: name, $options: "i" } } : {};
    const colorFilter = color ? {"color.name":{$in:[...color]}} : {};
    const categoryFilter = category ? { category:category}:{};
    try{
        if(id==="all"){
            const count = await ProductModel.find({
                
                ...categoryFilter,
                ...priceFilter,
                ...ratingFilter,
                ...nameFilter,
                ...colorFilter,
              }).count();
              const categories = await ProductModel.find({
                ...categoryFilter,
                ...priceFilter,
                ...ratingFilter,
                ...nameFilter,
                ...colorFilter,
                // "color.name":{$in:[...color]}
              })
              .skip((page-1)*limit)
              .limit(limit)
              res.status(201).send({ categories, page, pages: Math.ceil(count / limit) });
        }else{
            const count = await ProductModel.find({
                gender: { $in: [`${id}`] },
                ...categoryFilter,
                ...priceFilter,
                ...ratingFilter,
                ...nameFilter,
                ...colorFilter,
              }).count();
              const categories = await ProductModel.find({
                gender: { $in: [`${id}`] },
                ...categoryFilter,
                ...priceFilter,
                ...ratingFilter,
                ...nameFilter,
                ...colorFilter,
              }) 
              .skip(limit*(page-1))
              .limit(limit);
            res.status(201).send({ categories, page, pages: Math.ceil(count / limit) });
        }
    }
    catch (err) {
        res.status(500).json({ message: `Internal Server Error ${err}` });
      }
})

productRouter.get("/sort",async(req,res)=>{
    const priceSort = Number(req.query.priceSort);
    const dateSort = req.query.dateSort || "";
    const limit = Number(req.query.limit);
    const page = Number(req.query.page) || 1;
    try{
            //    const product = await ProductModel.find().sort({updatedAt:-1}).skip((page-1)*limit)
            // .limit(limit);
            //  return res.status(201).json({produtcs:product})
        if(dateSort=="newest"){
            const product = await ProductModel.find().sort({updatedAt:-1}).skip((page-1)*limit)
            .limit(limit);
             return res.status(201).json({produtcs:product})
        }
        if(priceSort){
            const product = await ProductModel.find().sort({price:priceSort}).skip((page-1)*limit)
            .limit(limit);
             return res.status(201).json({produtcs:product})
        }
        res.json(priceSort);
    }
    catch(e){
        res.status(500).json({ message: `Internal Server Error ${e}`})
    }
})
productRouter.get('/filter2',async(req,res)=>{
    try{
        // const skip =
        // req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0
        // const products = await ProductModel.find({},undefined,{skip,limit:4}).sort('name');
        // return res.status(200).json({products});
        const colors=req.query.colors;
        const products = await ProductModel.find({"color.name":{$in:[...colors]}});
        res.json({products});
    }
    catch (e) {
        res.status(500).send()
      }
})

productRouter.get("/ownProducts",async(req,res)=>{
    try{
        const products = await ProductModel.find().populate({path:'sellerId',select:'_id username picture email updatedAt'});
        return res.json(products);
    }
    catch(e){
        res.status(500).json({ message: `Internal Server Error ${e}`})
    }
})

//api delete own products
productRouter.post("/delete",verifyToken,async(req, res)=>{
    const {id} = req.body;
    try{
        await ProductModel.deleteMany({ sellerId:req.user._id, _id:[...id]});
        const products = await ProductModel.find({sellerId:req.user._id});
        return res.status(200).json(products);
    }
    catch(err){
        return res.status(500).json({ message: `Internal Server Error ${err}`});
    } 
})
//api search my products
productRouter.post("/search/mine",verifyToken,async(req, res)=>{
    const name = req.body.name || "";
    const nameFilter = name ? { name: { $regex: name, $options: "i" } } : {};
    try{
        const products = await ProductModel.find({...nameFilter,sellerId:req.user._id});
        return res.status(200).json({products});
    }
    catch(err){
        return res.status(500).json({ message: `Internal Server Error ${err}`});
    } 
})
export default productRouter;