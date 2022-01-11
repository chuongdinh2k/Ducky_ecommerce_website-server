import express from "express";
import cors from "cors";
import authRouter from './routes/userRoute.js';
import productRouter from './routes/ProductRouter.js';
import mongoose from 'mongoose';
import dotenv from "dotenv";
import cartRouter from "./routes/cartRouter.js";
import orderRouter from "./routes/orderRouter.js";
import blogRouter from "./routes/blogRouter.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(express.json({ limit: "30mb" }));
app.use(express.json());
app.use(cors());

const URI = process.env.MONGODB_URL;

// router register
app.use("/api/auth", authRouter);

//route product
app.use("/api/product",productRouter);

//route cart
app.use("/api/cart", cartRouter);

//route order
app.use("/api/order", orderRouter);

//route blog
app.use("/api/blog",blogRouter);

app.get('/', function (req, res) {
  res.send('Hello World!');
});
app.listen(5000, function () {
  console.log(`Example app listening on port ${URI}`);
});
mongoose
  .connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to DB");
    // app.listen(PORT, () => {
    //   console.log(`Server is running on ${PORT}`);
    // });
  })
  .catch((err) => {
    console.log("err", err);
  });


