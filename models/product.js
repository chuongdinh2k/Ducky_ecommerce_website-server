import mongoose from "mongoose";

  const review2Schema = new mongoose.Schema(
    {
      name:{type:String,required:true},
      comment:{type:String,required:true}
    }
  )
  const reviewSchema = new mongoose.Schema(
    {
      
      // name: { type: String, required: true },
      comment: { type: String },
      rating: { type: Number, required: true },
      user:{type: String, ref: "User", required: true},
      // picture:{ type: String},
      review2:[review2Schema]
    },
    {
      timestamps: true,
    }
  );
  const listImageSchema = new mongoose.Schema(
    {
        link:{type: String,}
    }
  )
  const productSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true },
      color:[{
        name:{type:String,required:true},
        hexCode:{ type: String}
      }],
      image: { type: String, required: true },
      // cloudinary_id: { type: String, required: true },
      gender:{type:String,required:true},
      description:{type:String,required:true},
      category: { type: String, required: true },
      price: { type: Number, required: true },
      rating: { type: Number, min: 1, max: 5 },
      countInStock: { type: Number, required: true },
      numReviews: { type: Number, required: true },
      reviews: [reviewSchema],
      listImage:[listImageSchema],
      email: { type: String, ref: "User", required: true },
      sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      sellerName:{ type: String, ref: "User", required: true },
      sold: {type: Number,required:true}
    },
    {
      timestamps: true,
    }
  );

  const ProductModel = mongoose.model("Product", productSchema);
  export default ProductModel;