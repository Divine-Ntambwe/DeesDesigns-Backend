require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
const base64 = require("base-64");
const app = express();
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
app.use(express.json());
app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, uuidv4() + file.originalname);
  },
});

const upload = multer({ storage });
app.use("uploads", express.static("uploads"));

const port = process.env.port || 5000;

const uri = process.env.DEESDESIGNS_CONNECTION_STRING;
let client, db;

async function connectToMongo() {
  client = new mongodb.MongoClient(uri, {
    serverApi: {
      version: mongodb.ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  await client.connect();
  db = client.db("DeesDesigns");
  console.log("connected to mongodb");
}

async function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization; //gets authorization method if there is any(-H'Authorization:'<auth methods>...)

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    //checks if there is an auth method and checks if it's basic
    return res
      .status(401)
      .json({ message: "Authorization header missing or invalid" });
  }

  //spliiting the credentials into user and password
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = base64.decode(base64Credentials).split(":");
  const email = credentials[0];
  const password = credentials[1];

  //checking if email exists and password is correct
  const customersCol = db.collection("customers");
  const cust = await customersCol.findOne({ email: email });

  const designersCol = db.collection("designers");
  const des = await designersCol.findOne({ email: email });

  if (!cust && !des) {
    return res.status(401).json({ message: "user not found" });
  }

  const decodedPW = cust
    ? base64.decode(cust.password)
    : base64.decode(des.password);

  if (decodedPW !== password) {
    return res.status(401).json({ message: "Invalid Password" });
  }

  req.user = cust || des;
  next();
}

//posting sign up details to customers collection if user is a customer
app.post("/customersSignUp", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = (m = "invalid input") => {
      status = 401;
      message = m;
    };
    let userDetails = req.body;
    const customersCol = db.collection("customers");

    if (!userDetails.email.includes("@")) {
      invalid("Invalid email");
      throw new Error("Invalid email");
    }

    if (await customersCol.findOne({ email: userDetails.email })) {
      invalid("User already exists please log in");
      throw new Error("User already exists please log in");
    }

    if (userDetails.password.length < 8) {
      invalid("Password Too Short");
      throw new Error("Password Too Short");
    }

    if (
      userDetails.password.match(/\d/g) == null ||
      userDetails.password.match(/[a-z]|[A-Z]/g) == null ||
      userDetails.password.match(/([\W]|_)/g) == null
    ) {
      invalid("Password should include numbers and letters and symbols");
      throw new Error(
        "Password should include numbers and letters and symbols"
      );
    }

    if (userDetails.password !== userDetails.confirmPassword) {
      invalid("Passwords do not match");
      throw new Error("Passwords do not match");
    }

    userDetails.password = base64.encode(userDetails.password);

    delete userDetails.confirmPassword;
    const newUser = await customersCol.insertOne({
      ...userDetails,
    });

    res
      .status(200)
      .json({ message: "Successfully signed up", newUser});
  } catch (error) {
    console.error("Error signining customer up: ", error);
    res.status(status).json({ error: message });
  }
});

//posting sign up details to designers collection if user is a designer
app.post("/designersSignUp", upload.single("pfp"), async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = (m = "invalid input") => {
      status = 401;
      message = m;
    };

    let userDetails = JSON.parse(req.body.details);

    const designersCol = db.collection("designers");

    console.log(userDetails);
    for (let i in userDetails) {
      if (userDetails[i].length === 0) {
        invalid("Please fill in all fields");
        throw new Error("Empty input fields");
      }
    }

    if (!userDetails.email.includes("@")) {
      invalid("Invalid email");
      throw new Error("Invalid email");
    }

    if (await designersCol.findOne({ email: userDetails.email })) {
      invalid("User already exists please log in");
      throw new Error("User already exists please log in");
    }

    if (userDetails.password.length < 8) {
      invalid("Password Too Short");
      throw new Error("Password Too Short");
    }
    if (
      userDetails.password.match(/\d/g) == null ||
      userDetails.password.match(/[a-z]|[A-Z]/g) == null ||
      userDetails.password.match(/([\W]|_)/g) == null
    ) {
      invalid("Password should include numbers and letters and symbols");
      throw new Error(
        "Password should include numbers and letters and symbols"
      );
    }

    if (userDetails.password !== userDetails.confirmPassword) {
      invalid("Passwords do not match");
      throw new Error("Passwords do not match");
    }

    if (
      userDetails.phoneNumber.replaceAll(" ", "").length !== 10 ||
      userDetails.phoneNumber.startsWith("0") == false
    ) {
      invalid("Phone number is invalid");
      throw new Error("Phone number is invalid");
    }

    userDetails.password = base64.encode(userDetails.password);

    delete userDetails.confirmPassword;
    const pfpPath = req.file.path;

    const newUser = await designersCol.insertOne({
      ...userDetails,
      pfpPath,
    });

    if (newUser) {
      res
        .status(200)
        .json({
          message: "Successfully signed up",
          ...newUser
        });
    } else {
      throw new Error("Could not sign up");
    }
  } catch (error) {
    console.error("Error signining designer up: ", error);
    res.status(status).json({ error: message });
  }
});

app.post("/userLogin", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const userDetails = req.body;
    const col = userDetails.isDesigner
      ? db.collection("designers")
      : db.collection("customers");
    console.log(userDetails);

    const invalid = (m = "invalid input") => {
      status = 401;
      message = m;
    };

    if (!userDetails.email || !userDetails.password) {
      invalid("enter email and password");
      throw new Error("enter email and password");
    }

    const user = await col.findOne({ email: userDetails.email }, {});

    if (!user) {
      invalid("Email does not exist please sign up");
      throw new Error("Email does not exist");
    }

    const decodedPassword = base64.decode(user.password);
    if (decodedPassword !== userDetails.password) {
      invalid("incorrect password");
      throw new Error("incorrect password");
    }

    res.status(200).json({ message: "successfully Logged In", ...user });
  } catch (error) {
    console.error("Error logging user in: ", error);
    res.status(status).json({ error: message });
  }
});

// app.use(basicAuth);

//getting all stock products so it can be displayed on the product pages
app.get("/stockProducts", async (req, res) => {
  try {
    const stockProductsCol = db.collection("stockProducts");
    const stockProducts = await stockProductsCol.find({}).toArray();

    if (stockProducts) {
      res.status(200).json(stockProducts);
    } else {
      throw new Error("Error getting products");
    }
  } catch (error) {
    console.error("Error getting all stock products: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//getting all designers products so it can be displayed on the product pages
app.get("/allDesignerProducts", async (req, res) => {
  try {
    const designersProductsCol = db.collection("designersProducts");
    const designersProducts = await designersProductsCol
      .find({ onSale: true })
      .toArray();

    if (designersProducts) {
      res.status(200).json(designersProducts);
    } else {
      throw new Error("No products to display");
    }
  } catch (error) {
    console.error("Error getting all designers products: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//getting a particular stock product when a user wants more information on it
app.get("/stockProduct/:stockProductId", async (req, res) => {
  try {
    const prodId = req.params.stockProductId;
    const stockProducts = db.collection("stockProducts");
    res
      .status(200)
      .json(await stockProducts.findOne({ stockProductId: prodId }));
  } catch (error) {
    console.error("Error getting stock product: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//getting a particular designer product when a user wants more information on it
app.get("/designersProduct/:designerProductId", async (req, res) => {
  try {
    const prodId = req.params.designerProductId;
    const designersProducts = db.collection("designersProducts");
    res
      .status(200)
      .json(await designersProducts.findOne({ designerProductId: prodId }));
  } catch (error) {
    console.error("Error getting designer product: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//getting all reviews relating to a specific product
app.get("/reviews/:productId", async (req, res) => {
  try {
    const prodId = req.params.productId;
    const reviewsCol = db.collection("reviews");
    const allReviews = await reviewsCol.find({ productId: prodId }).toArray();
    console.log(prodId);
    res.status(200).json(allReviews ? allReviews : "No reviews yet");
  } catch (error) {
    console.error("Error getting reviews: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//posting to cart database when user adds an item to cart
app.post("/addToCart", async (req, res) => {
  try {
    const cartItem = req.body; //quantity,size

    const cartCol = db.collection("cart");
    const product = await cartCol.findOne({
      productId: cartItem.productId,
      size: cartItem.size,
      customerId: cartItem.customerId,
    });

    if (product) {
      await cartCol.updateOne(
        { productId: cartItem.productId, size: cartItem.size },
        { $inc: { quantity: 1 } }
      );
    } else {
      await cartCol.insertOne(cartItem);
    }

    res.status(200).json(cartItem);
  } catch (error) {
    console.error("Error adding to cart: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//deleting a cart item when a user removes an item from their cart
app.delete("/removeCartItem/:cartId", async (req, res) => {
  try {
    const cartId = req.params.cartId;
    await db
      .collection("cart")
      .deleteOne({ _id: new mongodb.ObjectId(cartId) });
    res.status(200).json({ message: "successfully deleted" });
  } catch (error) {
    console.error("Error deleting from cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//getting all cart items in a specfic users cart
app.get("/cart/:customerId", async (req, res) => {
  try {
    const custId = req.params.customerId;
    const cartItems = await db
      .collection("cart")
      .find({ customerId: custId })
      .toArray();
    res.status(200).json(cartItems);
  } catch (error) {
    console.error("Error getting all cart items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//removing all checked out items from a users cart
app.delete("/removeCheckedOutItems/:customerId", async (req, res) => {
  try {
    const custId = req.params.customerId;
    const result = await db.collection("cart").deleteMany({ customerId: custId });

    if (result.deletedCount){
      res.status(200).json({ message: "successfully deleted items" });
    } else {
      throw new Error("couldn't delete")
    }
    
  } catch (error) {
    console.error("Error removing all cart items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/getAddressAndBankDetails/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const bankDetails = await db
      .collection("usersBankDetails")
      .findOne({ userId: customerId });
    const addressDetails = await db
      .collection("customersAddress")
      .findOne({ customerId });

    res.status(200).json({ ...bankDetails, ...addressDetails });
  } catch (error) {
    console.error("Error getting Address and Bank details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//posting new bank details
app.post("/usersBankDetails/:customerId", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = () => {
      status = 401;
      message = "invalid input";
    };

    const details = req.body; //cvv: cardNumber: expiryDate:YYYY-MM-DD
    const custId = req.params.customerId;

    if (details.cardNumber.replaceAll(" ", "").length !== 16) {
      invalid();
      throw new Error("invalid card number");
    }

    if (
      (await db
        .collection("userBankDetails")
        .findOne({ cardNumber: details.cardNumber })) !== null
    ) {
      invalid();
      throw new Error("bank details already exists");
    }

    if (details.cvv.length !== 4) {
      invalid();
      throw new Error("Invalid CVV number");
    }
    const expDate = new Date(details.expiryDate);
    console.log(new Date());
    if (expDate < new Date()) {
      invalid();
      throw new Error("Credit card is already expired");
    }
    delete details.expiryDate;
    result = await db
      .collection("usersBankDetails")
      .insertOne({ userId: custId, ...details, expiryDate: expDate });
    res.status(200).json(result);
  } catch (error) {
    console.error(" error saving bank details", error);
    res.status(status).json({ message: message });
  }
});

//posting new address
app.post("/saveAddress/:customerId", async (req, res) => {
  try {
    const details = req.body; //streetAddress: suburb: city: postalCode:
    const customerId = req.params.customerId;

    const address = await db
      .collection("customersAddress")
      .insertOne({ customerId, ...details });
    res.status(200).json(address);
  } catch (error) {
    console.error("error saving address details", error);
    res.status(500).json({ message: "Internal Server error" });
  }
});

//posting order details of the checked out items
app.post("/orders/:customerId", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
     const invalid = (m = "invalid input") => {
      status = 401;
      message = m;
    };
    const orderDetails = req.body; //paymentMethod: ,purchasedProducts:[{productId,quantity,size}]
    const customerId = req.params.customerId;
    
    const address = await db
      .collection("customersAddress")
      .updateOne({customerId},{ $set:{...orderDetails.address} });

    if (orderDetails.bankDetails.cardNumber.replaceAll(/\s/g, "").length !== 16 || /\D/.test(orderDetails.bankDetails.cardNumber.replaceAll(/\s/g, ""))) {
      invalid("invalid card number");
      throw new Error("invalid card number");  
    }

    if (
      (await db
        .collection("userBankDetails")
        .findOne({ cardNumber: orderDetails.bankDetails.cardNumber })) !== 
        await db
        .collection("userBankDetails")
        .findOne({customerId})

    ) {
      invalid("bank details already exists");
      throw new Error("bank details already exists");
    }


    if (orderDetails.bankDetails.cvv.length !== 4 || /\D/.test(orderDetails.bankDetails.cvv)) {
      invalid("Invalid CVV number");
      throw new Error("Invalid CVV number");
    }
    const expDate = new Date(orderDetails.bankDetails.expiryDate);
  
    if (expDate < new Date()) {
      invalid("Credit card is already expired");
      throw new Error("Credit card is already expired");
    }
  
    await db
      .collection("usersBankDetails")
      .updateOne({ userId: customerId},{$set:{ ...orderDetails.bankDetails}});  

     

    const productDetails = orderDetails.purchasedProducts;

    for (i of productDetails) {
      let product = {};
      product.productId = i.productId;
      console.log(i.productProvider)
      product = i.productProvider === "stock"
        ? await db
            .collection("stockProducts")
            .findOne(
              { _id: new mongodb.ObjectId(i.productId) },
              { projection: { name: 1, price: 1, itemsInStock: 1, _id: 0 } }
            )
        : await db
            .collection("designersProducts")
            .findOne(
              { _id: new mongodb.ObjectId(i.productId) },
              { projection: { name: 1, price: 1, itemsInStock: 1, _id: 0 } }
            );

      if (!product){
        console.log(i.productId)
        invalid("product " +i.productName +" does not exist anymore")
        throw new Error("product does not exist anymore")
      }      
  
      product.itemsInStock[i.size] = product.itemsInStock[i.size] - i.quantity;
      

      if (product.itemsInStock[i.size] < 0) {
        invalid("product "+i.productName+ " is no longer available in the quantity you want");
        throw new Error("product is no longer available in the quantity you want");
      }

      console.log(product.itemsInStock)
       

      if (i.productProvider === "stock") {
        await db
          .collection("stockProducts")
          .updateOne(
            { _id: new mongodb.ObjectId(i.productId) },
            { $set: { itemsInStock: product.itemsInStock } }
          );
      } else {
        await db
          .collection("designersProducts")
          .updateOne(
            { _id: new mongodb.ObjectId(i.productId) },
            { $set: { onSale: false } }
          );
      }

       
    }
    const dateOfDelivery = new Date(new Date().setDate(new Date().getDate() + (Math.floor(Math.random()*3)+5)))
    const orderResult = await db.collection("orders").insertOne({
      ...orderDetails,
      dateOfPurchase: new Date(),
      dateOfDelivery,
      statusOfExchange: "confirmed",
    });

    const deletedResult = await db.collection("cart").deleteMany({ customerId });

    if (!deletedResult.deletedCount){
      throw new Error("couldn't delete")
    } 

    
       

    res.status(200).json(orderResult);
  } catch (error) {
    console.error("error creating order:", error);
    res.status(status).json({ error: message });
  }
});

//getiing details of a specific order
app.get("/customerOrders/:customerId", async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const ordersDetails = await db
      .collection("orders")
      .find({ customerId }).toArray();
    

    
    for (let order of ordersDetails){
      
    const daysInProcess = new Date(order.dateOfDelivery - order.dateOfPurchase).getDate() - 2;
    console.log(daysInProcess)
    
     if (Date.parse(new Date()) <= Date.parse(`1970/01/${daysInProcess}`) + Date.parse(order.dateOfPurchase) 
    && new Date().toDateString() !== order.dateOfPurchase.toDateString()){
      await db.collection("orders").updateOne({_id:order._id},{$set:{statusOfExchange:"is being processed"}})
    } 
      
    if (new Date(Date.parse(new Date()) === new Date(Date.parse(`1970/01/${daysInProcess + 1}`) + Date.parse(order.dateOfPurchase)).toDateString())){
      await db.collection("orders").updateOne({_id:order._id},{$set:{statusOfExchange:"in transit"}})
    }  

    if ((new Date(Date.parse(new Date())).toDateString() === new Date(Date.parse(`1970/01/${daysInProcess + 2}`) + Date.parse(order.dateOfPurchase)).toDateString())){
      await db.collection("orders").updateOne({_id:order._id},{$set:{statusOfExchange:"has hit the road"}})
    }    
    
    if ((new Date(Date.parse(new Date())).toDateString() === new Date(Date.parse(`1970/01/${daysInProcess + 1}`) + Date.parse(order.dateOfPurchase)).toDateString())){
      await db.collection("orders").updateOne({_id:order._id},{$set:{statusOfExchange:"delivered"}})
    }  
    } 
 

    const result = await db
      .collection("orders")
      .find({ customerId }).toArray();
      
    res.status(200).json(result);
  } catch (error) {
    console.error("error getting product", error);
    res.status(500).json({ message: "internal server error" });
  }
});

//posting a review a user leaves
app.post("/uploadReview/:customerId/:productId", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = () => {
      status = 401;
      message = "invalid operation";
    };
    const review = req.body; //review,rating
    const custId = req.params.customerId;
    const prodId = req.params.productId;
    const productDetails = await db
      .collection("orders")
      .findOne({ customerId: custId });
    if (!productDetails) {
      invalid();
      throw new Error(
        "You can not write a review as you have not received this product"
      );
    }

    let found = false;
    for (let i of productDetails.purchasedProducts) {
      if (i.productId == prodId) {
        found = true;
      }
    }

    if (!found) {
      invalid();
      throw new Error(
        "You can not write a review as you have not received this product"
      );
    }

    const user = await db
      .collection("customers")
      .findOne({ customerId: custId });
    const name = user.name;
    const surname = user.surname;
    const result = await db.collection("reviews").insertOne({
      name: name,
      surname: surname,
      productId: prodId,
      dateOfUpload: new Date(),
      ...review,
    });
    res.status(200).json({ message: "successfully uploaded" });
  } catch (error) {
    console.error("error creating review", error);
    res.status(status).json({ message: message });
  }
});

//getting all designer products posted by a specifc designer
app.get("/designersProducts/:designerId", async (req, res) => {
  try {
    const desId = req.params.designerId;
    const desProducts = await db
      .collection("designersProducts")
      .find({ designerId: desId })
      .toArray();
    res.status(200).json(desProducts);
  } catch (error) {
    console.error("error getting designer's products", error);
    res.status(500).json({ message: "internal server error" });
  }
});

//creating a new designer product
app.post("/uploadDesignersProduct/:designerId", async (req, res) => {
  try {
    const newItem = req.body; //
    const desId = req.params.designerId;
    const designersCol = db.collection("designers");
    let desIdNo = await designersCol.find({}).toArray();
    desIdNo = desIdNo.length + 1;

    const result = {
      designerProductId: `DP${
        desIdNo.toString().length == 1 ? "0" + desIdNo : desIdNo
      }`,
      designerId: desId,
      ...newItem,
      onSale: true,
    };

    await designersCol.insertOne(result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error creating new design: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//removing a designer product when a designer wants to remove it
app.delete("/removeDesignersProducts/:designerProductId", async (req, res) => {
  try {
    const desProdId = req.params.designerProductId;
    await db
      .collection("designersProducts")
      .updateOne({ designerProductId: desProdId }, { $set: { onSale: false } });
    res.status(200).json({ message: "successfully deleted" });
  } catch (error) {
    console.error("error deleting a designer's product", error);
    res.status(500).json({ message: "internal server error" });
  }
});

//updating details for a specific designer products
app.put("/editDesignerProductDetails/:designerProductId", async (req, res) => {
  try {
    const updates = req.body;
    const desProdId = req.params.designerProductId;
    await db
      .collection("designersProducts")
      .updateOne({ designerProductId: desProdId }, { $set: { ...updates } });
    res.status(200).json({ message: "successfully updated" });
  } catch (error) {
    console.error("error getting designer's products", error);
    res.status(500).json({ message: "internal server error" });
  }
});

app.get("/designerContactInfo/:designerId", async (req, res) => {
  try {
    const desId = req.params.designerId;
    const result = await db
      .collection("designers")
      .findOne(
        { designerId: desId },
        {
          projection: {
            name: 1,
            surname: 1,
            phoneNumber: 1,
            email: 1,
            gender: 1,
          },
        }
      );
    res.status(200).json(result);
  } catch (error) {
    console.error("error getting designer's products", error);
    res.status(500).json({ message: "internal server error" });
  }
});

app.listen(port, async () => {
  console.log(`The server has started on http://localhost:${port}`);
  await connectToMongo();
});
