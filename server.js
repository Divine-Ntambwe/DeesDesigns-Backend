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
      ...userDetails,
      isApplicationApproved: false,
    });
    res.status(200).json({ message: "Successfully signed up" });
  } catch (error) {
    console.error("Error signining designer up: ", error);
    res.status(status).json({ message: message });
  }
});

//getting a single user by their email so the password can be checked if user is a customer
app.get("/customerLogin", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const customersCol = db.collection("customers");
    const custEmail = req.query.email;
    const custPassword = req.query.password;

    const invalid = () => {
      status = 401;
      message = "invalid input";
    };

    if (!custEmail || !custPassword) {
      invalid();
      throw new Error("enter email and password");
    }

    const cust = await customersCol.findOne(
      { email: custEmail },
      { email: 1, password: 1 }
    );
    if (!cust) {
      invalid();
      throw new Error("Email does not exist");
    }

    const decodedPassword = base64.decode(cust.password);
    if (decodedPassword !== custPassword) {
      invalid();
      throw new Error("incorrect password");
    }

    res.status(200).json({ message: "successfully logged in" });
  } catch (error) {
    console.error("Error logging customer in: ", error);
    res.status(status).json({ message: message });
  }
});

//getting a single designer by their email so the password can be checked
app.get("/designersLogin", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const designersCol = db.collection("designers");
    const desEmail = req.query.email;
    const desPassword = req.query.password;
    const invalid = () => {
      status = 401;
      message = "invalid input";
    };

    if (!desEmail || !desPassword) {
      invalid();
      throw new Error("enter email and password");
    }

    const des = await designersCol.findOne(
      { email: desEmail },
      { email: 1, password: 1 }
    );
    if (!des) {
      invalid();
      throw new Error("Email does not exist");
    }

    const decodedPassword = base64.decode(des.password);
    if (decodedPassword !== desPassword) {
      invalid();
      throw new Error("incorrect password");
    }

    res.status(200).json({ message: "successfully logged in" });
  } catch (error) {
    console.error("Error logging designer in: ", error);
    res.status(status).json({ message: message });
  }
});

//getting all stock products so it can be displayed on the product pages
app.get("/stockProducts", async (req, res) => {
  try {
    const stockProducts = db.collection("stockProducts");
    res.status(200).json(await stockProducts.find({}).toArray());
  } catch (error) {
    console.error("Error getting all stock products: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//getting all designers products so it can be displayed on the product pages
app.get("/designersProducts", async (req, res) => {
  try {
    const designersProducts = db.collection("designersProducts");
    res.status(200).json(await designersProducts.find({}).toArray());
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
    const cartItem = req.body;
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

    const details = req.body;
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
    if (expDate < new Date()) {
      invalid();
      throw new Error("Credit card is already expired");
    }
    delete details.expiryDate;
    details = await db
      .collection("usersBankDetails")
      .insertOne({ userId: custId, ...details, expiryDate: expDate });
    res.status(200).json(details);
  } catch (error) {
    console.error(" error saving bank details", error);
    res.status(status).json({ message: message });
  }
});

//posting new address
app.post("/saveAddress/:customerId", async (req, res) => {
  let status = 500;
  let message = "Internal server error";

  try {
    const invalid = () => {
      status = 401;
      message = "invalid input";
    };

    const details = req.body;
    const custId = req.params.customerId;

    const address = await db
      .collection("customersAddress")
      .insertOne({ custId, ...details });
    res.status(200).json(address);
  } catch (error) {
    console.error("error saving address details", error);
    res.status(status).json({ message: message });
  }
});

//posting order details of the checked out items
app.post("/orders/:customerId", async (req, res) => {
  try {
    const details = req.body;
    const custId = req.params.customerId;
    const order = await db
      .collection("orders")
      .insertOne({
        customerId: custId,
        ...details,
        dateOfPurchase: new Date(),
        dateOfDelivery: null,
        statusOfExchange: "is being processed",
      });
    res.status(200).json(order);
  } catch (error) {
    console.error("error creating order", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//getiing details of a specific order
app.get("/orders/:orderId", async (req, res) => {
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
app.post("/reviews/:customerId/:productId", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = () => {
      status = 401;
      message = "invalid operation";
    };
    const review = req.body;
    const custId = req.params.customerId;
    const prodId = req.params.productId;
    const productDetails = await db
      .collection("orders")
      .findOne({ customerId: custId });
    if (!productDetails) {
      invalid();
      throw new Erorr(
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
      throw new Erorr(
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
    const newItem = req.body;
    const desId = req.params.designerId;
    const designersCol = db.collection("designers")
    let desIdNo = await designersCol.find({}).toArray();
    desIdNo = desIdNo.length + 1;

    const result = {
      designerProductId: `DP${
        desIdNo.toString().length == 1 ? "0" + desIdNo : desIdNo
      }`,desId,...newItem, onSale: true
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
      .updateOne({ _id: new mongodb.ObjectId(desProdId) },{$set:{onSale:false}});
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
        { _id: new mongodb.ObjectId(desProdId) },
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
