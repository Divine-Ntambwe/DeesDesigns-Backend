require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
const base64 = require("base-64");
const app = express();
app.use(express.json());

const port = process.env.port || 3000;

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


async function basicAuth(req,res,next){
  const authHeader = req.headers.authorization; //gets authorization method if there is any(-H'Authorization:'<auth methods>...)
  
  if (!authHeader || !authHeader.startsWith("Basic ")) { //checks if there is an auth method and checks if it's basic
    return res.status(401).json({message:"Authorization header missing or invalid"})
  }
  
  //spliiting the credentials into user and password
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = base64.decode(base64Credentials).split(":");
  const email = credentials[0];
  const password = credentials[1];

  //checking if email exists and password is correct
  const customersCol = db.collection("customers");
  const cust = await customersCol.findOne({email: email})

  const designersCol = db.collection("designers");
  const des = await designersCol.findOne({email: email})

  if (!cust && !des){
    return res.status(401).json({message: "user not found"})
  }

  const decodedPW = cust? base64.decode(cust.password) : base64.decode(des.password)  ;

  if (decodedPW !== password){
    return res.status(401).json({message:"Invalid Password"});
  }

  req.user = cust || des;
  next();

}

//posting sign up details to customers collection if user is a customer
app.post("/customersSignUp", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = () => {
      status = 401;
      message = "invalid input";
    };
    let userDetails = req.body;
    const customersCol = db.collection("customers");

    if (!userDetails.email.includes("@")) {
      invalid();
      throw new Error("Invalid email");
    }

    if (await customersCol.findOne({ email: userDetails.email })) {
      invalid();
      throw new Error("User already exists please log in");
    }

    if (userDetails.password.length < 8) {
      invalid();
      throw new Error("Password Too Short");
    }
    if (
      userDetails.password.match(/\d/g) == null ||
      userDetails.password.match(/\D/g) == null ||
      userDetails.password.match(/([\W]|_)/g) == null
    ) {
      invalid();
      throw new Error(
        "Password should include numbers and letters and symbols"
      );
    }

    if (userDetails.password !== userDetails.confirmPassword) {
      invalid();
      throw new Error("Passwords do not match");
    }

    if (
      userDetails.phoneNumber.replaceAll(" ", "").length !== 10 ||
      userDetails.phoneNumber.startsWith("0") == false
    ) {
      invalid();
      throw new Error("Phone number is invalid");
    }

    userDetails.password = base64.encode(userDetails.password);

    delete userDetails.confirmPassword;
    let userIdNo = await customersCol.find({}).toArray();
    userIdNo = userIdNo.length + 1;
    const newUser = await customersCol.insertOne({
      customerId: `CC${
        userIdNo.toString().length == 1 ? "0" + userIdNo : userIdNo
      }`,
      ...userDetails,
    });
    res.status(200).json({ message: "Successfully signed up" });
  } catch (error) {
    console.error("Error signining customer up: ", error);
    res.status(status).json({ message: message });
  }
});

//posting sign up details to designers collection if user is a designer
app.post("/designersSignUp", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = () => {
      status = 401;
      message = "invalid input";
    };

    let userDetails = req.body;
    const designersCol = db.collection("designers");

    if (!userDetails.email.includes("@")) {
      invalid();
      throw new Error("Invalid email");
    }

    if (await designersCol.findOne({ email: userDetails.email })) {
      invalid();
      throw new Error("User already exists please log in");
    }

    if (userDetails.password.length < 8) {
      invalid();
      throw new Error("Password Too Short");
    }
    if (
      userDetails.password.match(/\d/g) == null ||
      userDetails.password.match(/\D/g) == null ||
      userDetails.password.match(/([\W]|_)/g) == null
    ) {
      invalid();
      throw new Error(
        "Password should include numbers and letters and symbols"
      );
    }

    if (userDetails.password !== userDetails.confirmPassword) {
      invalid();
      throw new Error("Passwords do not match");
    }

    if (
      userDetails.phoneNumber.replaceAll(" ", "").length !== 10 ||
      userDetails.phoneNumber.startsWith("0") == false
    ) {
      invalid();
      throw new Error("Phone number is invalid");
    }

    userDetails.password = base64.encode(userDetails.password);

    delete userDetails.confirmPassword;
    let userIdNo = await designersCol.find({}).toArray();
    userIdNo = userIdNo.length + 1;
    const newUser = await designersCol.insertOne({
      designerId: `DD${
        userIdNo.toString().length == 1 ? "0" + userIdNo : userIdNo
      }`,
      ...userDetails
    });

    if (newUser){res.status(200).json({ message: "Successfully signed up" })}else{ invalid();
      throw new Error("Could not sign up");};

  } catch (error) {
    console.error("Error signining designer up: ", error);
    res.status(status).json({ message: message });
  }
});
app.use(basicAuth);


app.get("/userLogin", async (req, res) => {
  try {
    res.status(200).json({ message: "successfully logged in",user: req.user["designerId" || "customerId"] });
  } catch (error) {
    console.error("Error logging user in: ", error);
    res.status(500).json("Internal Server Error");
  }
});


//getting all stock products so it can be displayed on the product pages
app.get("/stockProducts", async (req, res) => {
  try {
    const stockProductsCol = db.collection("stockProducts");
    const stockProducts = await stockProductsCol.find({}).toArray();

    if(stockProducts){
    res.status(200).json(stockProducts);} else {
      throw new Error("Error getting products");}
  } catch (error) {
    console.error("Error getting all stock products: ", error);
    res.status(500).json({ message:"Internal server error" });
  }
});

//getting all designers products so it can be displayed on the product pages
app.get("/allDesignerProducts", async (req, res) => {
  try {
    const designersProductsCol = db.collection("designersProducts");
    const designersProducts = await designersProductsCol.find({onsale:true}).toArray()

   if (designersProducts){
    res.status(200).json(designersProducts);} else {
      throw new Error("No products to display");}
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
    console.log(allReviews);
    res.status(200).json(allReviews ? allReviews : "No reviews yet");
  } catch (error) {
    console.error("Error getting reviews: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//posting to cart database when user adds an item to cart
app.post("/addToCart/:customerId/:productId", async (req, res) => {
  try {
    const cartItem = req.body; //quantity,size
    const custId = req.params.customerId;
    const prodId = req.params.productId;
    const quantity = cartItem.quantity;
    const size = cartItem.size;


    const cartCol = db.collection("cart");
    const product = prodId.startsWith("SP")
      ? await db.collection("stockProducts").findOne({ stockProductId: prodId })
      : await db
          .collection("designersProducts")
          .findOne({ designerProductId: prodId });

    const result = {
      customerId: custId,
      productId: prodId,
      productName: product.name,
      price: product.price,
      size: size,
      quantity: quantity,
    };

    await cartCol.insertOne(result);
    res.status(200).json(result);
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
    await db.collection("cart").deleteMany({ customerId: custId });
    res.status(200).json({ message: "successfully deleted items" });
  } catch (error) {
    console.error("Error removing all cart items:", error);
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

    const details = req.body;//cvv: cardNumber: expiryDate:YYYY-MM-DD
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
    const expDate = new Date(details.expiryDate) ;
    console.log(new Date())
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
    const details = req.body;//streetAddress: suburb: city: postalCode:
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
  try {
    const orderDetails = req.body; //paymentMethod: ,purchasedProducts:[{productId,quantity,size}]
    const custId = req.params.customerId;

    const productDetails = orderDetails.purchasedProducts
    const purchasedProducts = [];
    let total = 0 ;
   
    for ( i of productDetails) {
      let product = {};
      product.productId = i.productId;

      product =  i.productId.startsWith("SP")? await db.collection("stockProducts").findOne({stockProductId:i.productId},{projection: {name:1,price:1,itemsInStock:1,_id:0}}):
        await db.collection("designersProducts").findOne({designerProductId:i.productId},{projection: {name:1,price:1,itemsInStock:1,_id:0}})

     
      

      product.itemsInStock[i.size] = product.itemsInStock[i.size] - i.quantity;
      console.log(product.itemsInStock[i.size]) ;
      total += product.price * i.quantity;
      if (i.productId.startsWith("SP")) {
        await db.collection("stockProducts").updateOne({stockProductId:i.productId},{$set:{itemsInStock: product.itemsInStock}})
      } else {
        await db.collection("designersProducts").updateOne({stockProductId:i.productId},{$set:{itemsInStock: product.itemsInStock}})
      }

      delete product.itemsInStock
      product.size = i.size
      product.quantity = i.quantity
      purchasedProducts.push(product)


    }

    const address = await db.collection("customersAddress").findOne({customerId:custId},{projection:{customerId:0,_id:0}});
    const bankDetails = await db.collection("usersBankDetails").findOne({customerId:custId},{projection:{customerId:0,_id:0}});
    
    const orderResult = await db
      .collection("orders")
      .insertOne({
        customerId: custId,
        address: {...address},
        bankDetails: {...bankDetails},
        paymentMethod: orderDetails.paymentMethod,
        purchasedProducts:purchasedProducts,
        totalAmount: total,
        dateOfPurchase: new Date(),
        dateOfDelivery: null,
        statusOfExchange: "is being processed",
      });
   
    res.status(200).json(orderResult);
  } catch (error) {
    console.error("error creating order", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//getiing details of a specific order
app.get("/order/:orderId", async (req, res) => {
  try {
    const id = req.params.orderId;
    const details = await db
      .collection("orders")
      .findOne({ _id: new mongodb.ObjectId(id) });
    res.status(200).json(details);
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
    const review = req.body;//review,rating
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
    const result = await db
      .collection("reviews")
      .insertOne({
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
app.post("/designersProducts/:designerId",async (req, res) => {
   try {
    const newItem = req.body;//
    const desId = req.params.designerId;
    const designersCol = db.collection("designers")
    let desIdNo = await designersCol.find({}).toArray();
    desIdNo = desIdNo.length + 1;

    const result = {
      designerProductId: `DP${
        desIdNo.toString().length == 1 ? "0" + desIdNo : desIdNo
      }`,designerId: desId,...newItem, onSale: true
    };

    await designersCol.insertOne(result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error creating new design: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//removing a designer product when a designer wants to remove it
app.put("/removeDesignersProducts/:designerProductId", async (req, res) => {
  try {
    const desProdId = req.params.designerProductId;
    await db
      .collection("designersProducts")
      .updateOne({ designerProductId:desProdId },{$set:{onSale:false}});
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
      .updateOne(
        { designerProductId: desProdId },
        { $set: { ...updates } }
      );
    res.status(200).json({ message: "successfully updated" });
  } catch (error) {
    console.error("error getting designer's products", error);
    res.status(500).json({ message: "internal server error" });
  }
});

app.get("/designerContactInfo/:designerId", async (req, res) => {
  try {
    const desId = req.params.designerId;
    const result = await db.collection("designers").findOne({designerId:desId},{projection: {name:1,surname:1,phoneNumber:1,email:1,gender:1}})
    res.status(200).json(result)
  } catch (error) {
    console.error("error getting designer's products", error);
    res.status(500).json({ message: "internal server error" });
  }
});

app.listen(port, async () => {
  console.log(`The server has started on http://localhost:${port}`);
  await connectToMongo();
 
});
