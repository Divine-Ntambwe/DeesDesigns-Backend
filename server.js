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
const { match } = require("assert");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { error } = require("console");
const aws = require("aws-sdk");
const { access } = require("fs");
const frontEndLink = process.env.FrontEndLink;
app.use(express.json());
app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + file.originalname);
  },
});

//AWS S3 BUCKET SET UP
const region = "us-east-1";
const bucketName = "dees-designs-uploads";
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new aws.S3({
  region,
  accessKeyId,
  secretAccessKey,
  signatureVersion: "v4",
});

async function generateUploadURL() {
  const imageName = crypto.randomBytes(15).toString("hex");

  const params = {
    Bucket: bucketName,
    Key: imageName,
    Expires: 60,
  };

  const uploadURL = await s3.getSignedUrlPromise("putObject", params);
  return uploadURL;
}

const upload = multer({ storage });
app.use("/uploads", express.static("uploads"));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "deesdesigns465@gmail.com",
    pass: "gxat mwpm yrqq cinm",
  },
});

const port = process.env.port || 5000;

const URI = process.env.URI;
let client, db;

async function connectToMongo() {
  client = new mongodb.MongoClient(URI, {
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
      .json({ error: "Authorization header missingg or invalid" });
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
    return res.status(401).json({ error: "user not found" });
  }

  const userPassword = cust ? cust.password : des.password;

  if (userPassword !== password) {
    return res.status(401).json({ error: "Invalid Password" });
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

    if (
      userDetails.mobileNumber.replaceAll(" ", "").length !== 10 ||
      userDetails.mobileNumber.startsWith("0") == false
    ) {
      invalid("Phone number is invalid");
      throw new Error("Phone number is invalid");
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

    await transporter.sendMail({
      from:"deesdesigns465@gmail.com",
      to:userDetails.email,
      subject: "Welcome to Dees Designs!",
      html:`<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #d07a7a, #e8b4b4); color: white; padding: 40px 24px; text-align: center;">
      <h1 style="margin: 0; font-family: 'Playwrite US Modern', cursive; font-size: 2.6em; font-weight: 400; letter-spacing: 1px;">
        Welcome to Dees Designs!
      </h1>
      <p style="margin: 16px 0 0; font-size: 1.2em; opacity: 0.95;">
      Get DEE best for you ♡
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 36px 32px; color: #333; text-align: center;">

      <!-- Celebration Image / Icon -->
      

      <!-- Welcome Message -->
      <h2 style="font-size: 1.6em; margin: 24px 0 12px; color: #444;">
        Hi <strong>${userDetails.name || 'there'}</strong>,
      </h2>

      <p style="font-size: 1.15em; line-height: 1.8; color: #555; margin: 0 0 20px;">
        Your account has been <strong style="color: #d07a7a;">successfully created</strong> — welcome to the Dees Designs family!
      </p>

      <p style="font-size: 1.05em; line-height: 1.8; color: #666; margin: 0 0 32px;">
        You’re now part of a beautiful community that celebrates handmade treasures, unique designs, and South African creativity. 
        Get ready to discover one-of-a-kind pieces made just for you.
      </p>

      <!-- CTA Button -->
      <a href="${frontEndLink}/Home" 
         style="display: inline-block; background: #d07a7a; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 1.1em; box-shadow: 0 4px 12px rgba(208,122,122,0.3);">
        Start Shopping
      </a>

      <!-- Extra Touch -->
      <p style="margin: 32px 0 8px; font-size: 0.95em; color: #888;">
        Have questions? We’re here for you.<br>
        Reply to this email or reach us at right here</a>
      </p>

      <!-- Closing -->
      <p style="margin: 40px 0 0; font-size: 1.05em; color: #666; line-height: 1.7;">
        So much love,<br>
        <strong style="color: #d07a7a;">The Dees Designs Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f4ecec; padding: 24px; text-align: center; font-size: 0.85em; color: #888;">
      <p style="margin: 0;">
        © 2025 Dees Designs ♡ Handmade in South Africa<br>
        Unique. Personal. Yours.
      </p>
    </div>
  </div>
</div>`
    });

    userDetails.password = base64.encode(userDetails.password);

    delete userDetails.confirmPassword;
    const newUser = await customersCol.insertOne({
      ...userDetails,
    });
    res.status(200).json({
      message: "Successfully signed up",
      _id: newUser.insertedId,
      ...userDetails,
    });
  } catch (error) {
    console.error("Error signining customer up: ", error);
    res.status(status).json({ error: message });
  }
});

//posting sign up details to designers collection if user is a designer
app.post("/designersSignUp", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = (m = "invalid input") => {
      status = 401;
      message = m;
    };
    console.log(req.body);
    let userDetails = req.body;

    const designersCol = db.collection("designers");

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

    await transporter.sendMail({
      from:"deesdesigns465@gmail.com",
      to:userDetails.email,
      subject: "Welcome to Dees Designs!",
      html:`<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #d07a7a, #e8b4b4); color: white; padding: 40px 24px; text-align: center;">
      <h1 style="margin: 0; font-family: 'Playwrite US Modern', cursive; font-size: 2.6em; font-weight: 400; letter-spacing: 1px;">
        Welcome to Dees Designs!
      </h1>
      <p style="margin: 16px 0 0; font-size: 1.2em; opacity: 0.95;">
      Handled With Care ♡
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 36px 32px; color: #333; text-align: center;">

      <!-- Celebration Image / Icon -->
      

      <!-- Welcome Message -->
      <h2 style="font-size: 1.6em; margin: 24px 0 12px; color: #444;">
        Hi <strong>${userDetails.name || 'there'}</strong>,
      </h2>

      <p style="font-size: 1.15em; line-height: 1.8; color: #555; margin: 0 0 20px;">
        Your account as a designer has been <strong style="color: #d07a7a;">successfully created</strong> — welcome to the Dees Designs family!
      </p>

      <p style="font-size: 1.05em; line-height: 1.8; color: #666; margin: 0 0 32px;">
        You’re now part of a beautiful community that celebrates handmade treasures, unique designs, and South African creativity. 
        Get ready to upload your one-of-a-kind pieces for people around you!
      </p>

      <!-- CTA Button -->
      <a href="${frontEndLink}/DesignersHome" 
         style="display: inline-block; background: #d07a7a; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 1.1em; box-shadow: 0 4px 12px rgba(208,122,122,0.3);">
        Start Uploading
      </a>

      <!-- Extra Touch -->
      <p style="margin: 32px 0 8px; font-size: 0.95em; color: #888;">
        Have questions? We’re here for you.<br>
        Reply to this email or reach us right here</a>
      </p>

      <!-- Closing -->
      <p style="margin: 40px 0 0; font-size: 1.05em; color: #666; line-height: 1.7;">
        So much love,<br>
        <strong style="color: #d07a7a;">The Dees Designs Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f4ecec; padding: 24px; text-align: center; font-size: 0.85em; color: #888;">
      <p style="margin: 0;">
        © 2025 Dees Designs ♡ Handmade in South Africa<br>
        Unique. Personal. Yours.
      </p>
    </div>
  </div>
</div>`
    });

    userDetails.password = base64.encode(userDetails.password);

    delete userDetails.confirmPassword;
    const pfpPath = userDetails.pfpPath;

    const newUser = await designersCol.insertOne({
      ...userDetails,
      pfpPath,
      rating: [],
    });
    if (newUser) {
      res.status(200).json({
        message: "Successfully signed up",
        _id: newUser.insertedId,
        ...userDetails,
        pfpPath,
        rating: [],
      });
    } else {
      throw new Error("Could not sign up");
    }
  } catch (error) {
    console.error("Error signining designer up: ", error);
    res.status(status).json({ error: message });
  }
});

app.get("/s3Url", async (req, res) => {
  const url = await generateUploadURL();
  res.json({ url });
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

app.get("/confirmCartRequest", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = (m = "invalid input") => {
      status = 401;
      message = m;
    };
    const { token } = req.query;
    const request = await db
      .collection("customerCartRequests")
      .findOne({ token });

    if (!request) {
      res.send(`
      <div style="color:#d07a7a;
                  height:90vh;display:flex;flex-direction:column;
                  align-items:center;justify-content:center;font-family:Arial">
        <h1 style="font-size:2.5rem;">❌ Invalid or Expired Link</h1>
        <p style="margin-top:10px;">Please request a new confirmation email.</p>
      </div>
    `);
      invalid("Invalid Token");
      throw new Error("Invalid Token");
    }

    if (Date.now() > request.expiresAt) {
      res.send(`
      <div style="color:#d07a7a;
                  height:90vh;display:flex;flex-direction:column;
                  align-items:center;justify-content:center;font-family:Arial">
        <h1 style="font-size:2.5rem;">⌛ Link Expired</h1>
        <p  style="margin-top:10px;">Please request a new confirmation email.</p>
      </div>
    `);
      invalid("Token expired");
      throw new Error("Token expired");
    }

    const {
      customerId,
      designerId,
      name,
      price,
      imagePath,
      productProvider,
      size,
      quantity,
    } = request;

    const cartCol = db.collection("cart");
    const result = await cartCol.insertOne({
      customerId,
      productName: name,
      designerId,
      price,
      imgPath: imagePath,
      productProvider,
      size,
      quantity,
    });

    if (result) {
      await db.collection("customerCartRequests").deleteOne({ token });
      res.status(200);
      res.send(`
    <div style="color:#d07a7a;
                height:100vh;display:flex;flex-direction:column;
                align-items:center;justify-content:center;font-family:raleway">
      <h1 style="font-size:4.5rem;">Email Confirmed!</h1>
     
       <p style="margin-top:10px;font-size:4.5rem;">You can now view product in your cart <a href="${frontEndLink}/Home">Home</a>.</p>
       
    </div>
  `);
    } else {
      throw new Error("couldn't confirm email");
    }
  } catch (error) {
    console.error("Error confirming email: ", error);
    res.status(status).json({ error: message });
  }
});

app.use(basicAuth);

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

// //getting a particular stock product when a user wants more information on it
// app.get("/stockProduct/:stockProductId", async (req, res) => {
//   try {
//     const prodId = req.params.stockProductId;
//     const stockProducts = db.collection("stockProducts");
//     res
//       .status(200)
//       .json(await stockProducts.findOne({ stockProductId: prodId }));
//   } catch (error) {
//     console.error("Error getting stock product: ", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// //getting a particular designer product when a user wants more information on it
// app.get("/designersProduct/:designerProductId", async (req, res) => {
//   try {
//     const prodId = req.params.designerProductId;
//     const designersProducts = db.collection("designersProducts");
//     res
//       .status(200)
//       .json(await designersProducts.findOne({ designerProductId: prodId }));
//   } catch (error) {
//     console.error("Error getting designer product: ", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

//getting all reviews relating to a specific product
app.get("/reviews/:productId", async (req, res) => {
  try {
    const prodId = req.params.productId;
    const reviewsCol = db.collection("reviews");
    const allReviews = await reviewsCol.find({ productId: prodId }).toArray();
    res.status(200).json(allReviews.length ? allReviews : "No reviews yet");
  } catch (error) {
    console.error("Error getting reviews: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/designerReviews/:designerId", async (req, res) => {
  try {
    const designerId = req.params.designerId;
    const reviewsCol = db.collection("reviews");
    const allReviews = await reviewsCol.find({ designerId }).toArray();
    res.status(200).json(allReviews ? allReviews : "No reviews yet");
    console.log(allReviews, designerId);
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
        { $inc: { quantity: cartItem.quantity } }
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

app.post("/addToLikes", async (req, res) => {
  try {
    const likedItem = req.body; //quantity,size

    const likesCol = db.collection("likes");

    await likesCol.insertOne(likedItem);

    res.status(200).json(likedItem);
  } catch (error) {
    console.error("Error liking product: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//deleting a cart item when a user removes an item from their cart
app.delete("/removeCartItem/:cartId", async (req, res) => {
  try {
    const cartId = req.params.cartId;
    const result = await db
      .collection("cart")
      .deleteOne({ _id: new mongodb.ObjectId(cartId) });
    console.log(result);
    if (result.deletedCount) {
      res.status(200).json(result);
    } else {
      throw new Error("could not delete");
    }
  } catch (error) {
    console.error("Error deleting from cart: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/removeLikedItem", async (req, res) => {
  try {
  
    const productId = req.body.productId;
    const result = await db
      .collection("likes")
      .deleteOne({productId});
    if (result.deletedCount) {
      res.status(200).json(result);
    } else {
      throw new Error("could not delete");
    }
  } catch (error) {
    console.error("Error deleting from likes: ", error);
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

app.get("/likes/:customerId", async (req, res) => {
  try {
    const custId = req.params.customerId;
    const likedItems = await db
      .collection("likes")
      .find({ customerId: custId })
      .toArray();
    res.status(200).json(likedItems);
  } catch (error) {
    console.error("Error getting all liked items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// //removing all checked out items from a users cart
// app.delete("/removeCheckedOutItems/:customerId", async (req, res) => {
//   try {
//     const custId = req.params.customerId;
//     const result = await db
//       .collection("cart")
//       .deleteMany({ customerId: custId });

//     if (result.deletedCount) {
//       res.status(200).json({ message: "successfully deleted items" });
//     } else {
//       throw new Error("couldn't delete");
//     }
//   } catch (error) {
//     console.error("Error removing all cart items:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

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

// //posting new bank details
// app.post("/usersBankDetails/:customerId", async (req, res) => {
//   let status = 500;
//   let message = "Internal server error";
//   try {
//     const invalid = () => {
//       status = 401;
//       message = "invalid input";
//     };

//     const details = req.body; //cvv: cardNumber: expiryDate:YYYY-MM-DD
//     const custId = req.params.customerId;

//     if (details.cardNumber.replaceAll(" ", "").length !== 16) {
//       invalid();
//       throw new Error("invalid card number");
//     }

//     if (
//       (await db
//         .collection("userBankDetails")
//         .findOne({ cardNumber: details.cardNumber })) !== null
//     ) {
//       invalid();
//       throw new Error("bank details already exists");
//     }

//     if (details.cvv.length !== 4) {
//       invalid();
//       throw new Error("Invalid CVV number");
//     }
//     const expDate = new Date(details.expiryDate);
//     console.log(new Date());
//     if (expDate < new Date()) {
//       invalid();
//       throw new Error("Credit card is already expired");
//     }
//     delete details.expiryDate;
//     result = await db
//       .collection("usersBankDetails")
//       .insertOne({ userId: custId, ...details, expiryDate: expDate });
//     res.status(200).json(result);
//   } catch (error) {
//     console.error(" error saving bank details", error);
//     res.status(status).json({ message: message });
//   }
// });

//posting new address
// app.post("/saveAddress/:customerId", async (req, res) => {
//   try {
//     const details = req.body; //streetAddress: suburb: city: postalCode:
//     const customerId = req.params.customerId;

//     const address = await db
//       .collection("customersAddress")
//       .insertOne({ customerId, ...details });
//     res.status(200).json(address);
//   } catch (error) {
//     console.error("error saving address details", error);
//     res.status(500).json({ message: "Internal Server error" });
//   }
// });

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
      .updateOne({ customerId }, { $set: { ...orderDetails.address } });

    if (!address.matchedCount) {
      await db
        .collection("customersAddress")
        .insertOne({ customerId, ...orderDetails.address });
    }

    if (orderDetails.bankDetails) {
      if (
        ![16, 17, 18, 19].includes(
          orderDetails.bankDetails.cardNumber.replaceAll(/\s/g, "").length
        ) ||
        /\D/.test(orderDetails.bankDetails.cardNumber.replaceAll(/\s/g, ""))
      ) {
        invalid("invalid card number");
        throw new Error("invalid card number");
      }

      const isCardNoExist = await db
        .collection("usersBankDetails")
        .find({
          cardNumber: orderDetails.bankDetails.cardNumber.replaceAll(/\s/g, ""),
        })
        .toArray();

      if (
        isCardNoExist.length === 1 &&
        isCardNoExist[0].userId !== customerId
      ) {
        invalid("bank details already exists");
        throw new Error("bank details already exists");
      }

      if (
        ![3, 4].includes(orderDetails.bankDetails.cvv.length) ||
        /\D/.test(orderDetails.bankDetails.cvv)
      ) {
        invalid("Invalid CVV number");
        throw new Error("Invalid CVV number");
      }
      const expDate = new Date(orderDetails.bankDetails.expiryDate);

      if (expDate < new Date()) {
        invalid("Credit card is already expired");
        throw new Error("Credit card is already expired");
      }

      const bankDetails = await db
        .collection("usersBankDetails")
        .updateOne(
          { userId: customerId },
          { $set: { ...orderDetails.bankDetails } }
        );

      if (!bankDetails.matchedCount) {
        await db
          .collection("usersBankDetails")
          .insertOne({ userId: customerId, ...orderDetails.bankDetails });
      }
    }

    const productDetails = orderDetails.purchasedProducts;

    for (i of productDetails) {
      let product = {};
      product.productId = i.productId;
      product =
        i.productProvider === "stockProduct"
          ? await db
              .collection("stockProducts")
              .findOne(
                { _id: new mongodb.ObjectId(i.productId) },
                { projection: { name: 1, price: 1, itemsInStock: 1, _id: 0 } }
              )
          : i.productProvider === "designerProduct"
          ? await db
              .collection("designersProducts")
              .findOne({ _id: new mongodb.ObjectId(i.productId) })
          : {};
      if (i.productProvider === "designer") break;
      if (!product) {
        invalid(
          `The product '${i.productName} - ${i.size}' does not exist anymore `
        );
        throw new Error("product does not exist anymore");
      }

      product.itemsInStock[i.size] = product.itemsInStock[i.size] - i.quantity;

      if (product.itemsInStock[i.size] < 0) {
        invalid(
          "The product " +
            i.productName + 
            " size "+
            i.size+
            " is no longer available in the quantity you want"
        );
        throw new Error(
          "product is no longer available in the quantity you want"
        );
      }

      if (i.productProvider === "stockProduct") {
        await db
          .collection("stockProducts")
          .updateOne(
            { _id: new mongodb.ObjectId(i.productId) },
            { $set: { itemsInStock: product.itemsInStock } }
          );
      } else if (i.productProvider === "designerProduct") {
        await db
          .collection("designersProducts")
          .updateOne(
            { _id: new mongodb.ObjectId(i.productId) },
            { $set: { onSale: false } }
          );

        await transporter.sendMail({
          from: "deesdesigns465@gmail.com",
          to: product.designerEmail,
          subject: "Your product has been purchased",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #d07a7a, #e8b4b4); color: white; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-family: 'Playwrite US Modern', cursive; font-size: 2.4em; font-weight: 400; letter-spacing: 0.5px;">
        Dees Designs
      </h1>
      <p style="margin: 12px 0 0; font-size: 1.1em; opacity: 0.95;">Celebrating your creativity</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px 28px; color: #333;">

      <!-- Greeting -->
      <p style="font-size: 1.25em; margin: 0 0 16px; color: #444;">
        Hi <strong>${product.uploadedBy}</strong>,
      </p>

      <!-- Success Message -->
      <p style="margin: 0 0 20px; font-size: 1.05em; line-height: 1.7;">
        <strong style="color: #d07a7a; font-size: 1.1em;">Congratulations!</strong><br>
        Your design, <strong style="color: #d07a7a;">“${product.name}”</strong>, has been purchased!
      </p>

      <!-- Product Image -->
      <div style="text-align: center; margin: 24px 0;">
        <img 
          src="${product.imagePath}" 
          alt="${product.name}" 
          width="100%" 
          style="max-width: 380px; height: auto; border-radius: 12px; box-shadow: 0 6px 16px rgba(0,0,0,0.1); display: block; margin: 0 auto; border: 1px solid #eee;"
        />
      </div>

      <!-- Delivery & Payout Info -->
      <p style="margin: 24px 0 20px; font-size: 1.05em; line-height: 1.7; text-align: center;">
        The order is confirmed and will be delivered via our trusted partners.<br>
        <strong>Your stipend will be sent within 2–3 business days.</strong>
      </p>

      <!-- Highlight Box -->
      <div style="background: #fdf6f6; border-left: 5px solid #d07a7a; padding: 18px; border-radius: 0 8px 8px 0; margin: 24px 0; font-size: 0.95em; line-height: 1.8; color: #444;">
        <p style="margin: 0; font-weight: 600; color: #d07a7a;">Your Creativity Shines</p>
        <p style="margin: 8px 0 0;">
          Every sale supports independent designers like you. Keep creating — your next masterpiece could be someone’s treasure!
        </p>
      </div>

      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${frontEndLink}/DesignersHome" 
           style="display: inline-block; background: #d07a7a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 1.05em; box-shadow: 0 3px 8px rgba(208, 122, 122, 0.3);">
          View Your Dashboard
        </a>
      </div>

      <!-- Closing -->
      <p style="margin: 32px 0 0; font-size: 1em; color: #666; line-height: 1.7; text-align: center;">
        With gratitude,<br>
        <strong style="color: #d07a7a;">The Dees Designs Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f4ecec; padding: 20px; text-align: center; font-size: 0.85em; color: #888;">
      <p style="margin: 0;">
        © 2025 Dees Designs. All rights reserved.<br>
        Empowering designers, one creation at a time
      </p>
    </div>
  </div>
</div>
            `,
        });
      }
    }
    const dateOfDelivery = new Date(
      new Date().setDate(
        new Date().getDate() + (Math.floor(Math.random() * 3) + 4)
      )
    );
    const orderResult = await db.collection("orders").insertOne({
      ...orderDetails,
      dateOfPurchase: new Date(),
      dateOfDelivery,
      statusOfExchange: "confirmed",
    });

    const deletedResult = await db
      .collection("cart")
      .deleteMany({ customerId });

    if (!deletedResult.deletedCount) {
      throw new Error("couldn't delete");
    }
    console.log(orderResult);
    let productDetailsHtml = "";
    orderDetails.purchasedProducts.map((item) => {
      productDetailsHtml += `
      <div
  key={item["_id"]}
  style="display:flex;gap:10px;margin:15px 0;align-items:flex-start;"
>
  <img
    src=${item.imgPath}
    alt={A picture of ${item.productName}}
    style="width:8vw;height:24vh;object-fit:cover;display:block;margin-right:10px"
  />

  <div style="display:grid;template-grid-columns:100%;">
    <h4 style="margin:0;font-size:1.3em;font-weight:600;color:#000;">
      ${item.productName}
    </h4>
    <p style="margin:0;font-size:1.2em;color:#000;">
      R${item.price}.00
    </p>
    <p style="margin:0;font-size:1.2em;color:#000;">
      Size: ${item.size}
    </p>
    <p style="margin:0;font-size:1.2em;color:#000;">
      Qty: ${item.quantity}
    </p>
  </div>
</div>
      `;
    });

    await transporter.sendMail({
      from: "deesdesigns465@gmail.com",
      to: orderDetails.customerDetails.email,
      subject: "Order Summary",
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #d07a7a, #e8b4b4); color: white; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-family: 'Playwrite US Modern', cursive; font-size: 2.4em; font-weight: 400; letter-spacing: 0.5px;">
        Dees Designs
      </h1>
      <p style="margin: 12px 0 0; font-size: 1.1em; opacity: 0.95;">Get DEE best for you!</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px 28px; color: #333;">

      <!-- Greeting -->
      <p style="font-size: 1.25em; margin: 0 0 16px; color: #444;">
        Hi <strong>${orderDetails.customerDetails.fullName}</strong>,
      </p>
      <p style="margin: 0 0 20px; font-size: 1.05em; line-height: 1.7;">
        Thank you for shopping with <strong>Dees Designs</strong>! We're thrilled to confirm your order and are preparing it with care.
      </p>

      <!-- Delivery Info + Track Button -->
      <p style="margin: 0 0 24px; font-size: 1.05em; line-height: 1.7;">
        Your order is confirmed and expected to arrive by:
        <br>
        <strong style="font-size: 1.2em; color: #d07a7a;">${dateOfDelivery.toDateString()}</strong>
      </p>

      <a href="${frontEndLink}/Orders?orderId=${orderResult.insertedId}" 
         style="display: inline-block; background: #d07a7a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 1.05em; text-align: center; box-shadow: 0 3px 8px rgba(208, 122, 122, 0.3);">
        Track Your Order
      </a>

      <!-- Order Details Section -->
      <h2 style="font-family: 'Playwrite US Modern', cursive; font-size: 2em; color: #d07a7a; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #fad4d4; display: inline-block;">
        Order Details
      </h2>

      <div style="background: #fdf6f6; padding: 18px; border-radius: 10px; font-size: 0.95em; line-height: 1.8; color: #444;">
        <p style="margin: 0 0 12px;"><strong>Order ID:</strong> <span style="color: #d07a7a; font-family: monospace;font-size:1em">${
          orderResult.insertedId
        }</span></p>
        <p style="margin: 0;"><strong>Delivery Address:</strong></p>
        <address style="margin: 8px 0 0; font-style: normal; color: #555; line-height: 1.7;">
          ${orderDetails.address.streetAddress}<br>
          ${orderDetails.address.suburb}, ${orderDetails.address.postalCode}<br>
          ${orderDetails.address.city}, South Africa
        </address>
      </div>

      <!-- Order Summary -->
      <h2 style="font-family: 'Playwrite US Modern', cursive; font-size: 2em; color: #d07a7a; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #fad4d4; display: inline-block;">
        Order Summary
      </h2>

      <div style="overflow-y: auto; max-height: 450px; padding: 8px; border: 1px solid #f0e0e0; border-radius: 8px; background: #fafafa;">
        ${productDetailsHtml}
      </div>

      <!-- Total -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
        <p style="display: flex; justify-content: space-between; align-items: center; font-size: 1.35em; font-weight: 600; margin: 0; color: #000;">
          <span>Total (incl. shipping):</span>
          <span style="color: #d07a7a;">R${orderDetails.totalAmount}</span>
        </p>
      </div>

      <!-- Closing -->
      <p style="margin: 32px 0 0; font-size: 1em; color: #666; line-height: 1.7;">
        Warm regards,<br>
        <strong style="color: #d07a7a;">The Dees Designs Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f4ecec; padding: 20px; text-align: center; font-size: 0.85em; color: #888;">
      <p style="margin: 0;">
        © 2025 Dees Designs. All rights reserved.<br>
        Handmade in South Africa with care and creativity
      </p>
    </div>
  </div>
</div>

      `,
    });

    res.status(200).json({ orderResult });
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
      .find({ customerId })
      .toArray();

    for (let order of ordersDetails) {
      const daysInProcess =
        new Date(order.dateOfDelivery - order.dateOfPurchase).getDate() - 2;

      if (
        Date.parse(new Date()) <=
          Date.parse(`1970/01/${daysInProcess}`) +
            Date.parse(order.dateOfPurchase) &&
        new Date().toDateString() !== order.dateOfPurchase.toDateString()
      ) {
        await db
          .collection("orders")
          .updateOne(
            { _id: order._id },
            { $set: { statusOfExchange: "is being processed" } }
          );
      }

      if (
        new Date().toDateString() ===
        new Date(
          Date.parse(`1970/01/${daysInProcess + 1}`) +
            Date.parse(order.dateOfPurchase)
        ).toDateString()
      ) {
        await db
          .collection("orders")
          .updateOne(
            { _id: order._id },
            { $set: { statusOfExchange: "in transit" } }
          );
      }

      if (
        new Date().toDateString() ===
        new Date(
          Date.parse(`1970/01/${daysInProcess + 2}`) +
            Date.parse(order.dateOfPurchase)
        ).toDateString()
      ) {
        await db
          .collection("orders")
          .updateOne(
            { _id: order._id },
            { $set: { statusOfExchange: "has hit the road!" } }
          );
      }

      if (
        Date.parse(new Date()) >=
         order.dateOfDelivery
      ) {
        await db
          .collection("orders")
          .updateOne(
            { _id: order._id },
            { $set: { statusOfExchange: "delivered" } }
          );
      }
    }

    const result = await db.collection("orders").find({ customerId }).toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error("error getting product", error);
    res.status(500).json({ message: "internal server error" });
  }
});

//posting a review a user leaves
app.post("/uploadReview/:customerId", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = (m = message) => {
      status = 401;
      message = m;
    };

    const custId = req.params.customerId;
    const { productId, name, surname, review, rating } = req.body;

    if (review) {
      await db.collection("reviews").insertOne({
        name,
        surname,
        productId,
        dateOfUpload: new Date(),
        review,
        rating,
      });
    }

    await db
      .collection("stockProducts")
      .updateOne(
        { _id: new mongodb.ObjectId(productId) },
        { $push: { rating: rating } }
      );
    res.status(200).json({ message: "successfully uploaded" });
  } catch (error) {
    console.error("error creating review", error);
    res.status(status).json({ message: message });
  }
});

//posting a review for designer a user leaves
app.post("/uploadReviewForDesigner", async (req, res) => {
  let status = 500;
  let message = "Internal server error";
  try {
    const invalid = (m = message) => {
      status = 401;
      message = m;
    };

    const { name, surname, review, rating, productId } = req.body;

    const product = await db
      .collection("designersProducts")
      .findOne({ _id: new mongodb.ObjectId(productId) });
    const designerId = product ? product.designerId : productId;
    if (review) {
      await db.collection("reviews").insertOne({
        name,
        surname,
        designerId,
        dateOfUpload: new Date(),
        review,
        rating,
      });
    }

    const result = await db
      .collection("designers")
      .updateOne(
        { _id: new mongodb.ObjectId(designerId) },
        { $push: { rating: rating } }
      );

    if (!result.modifiedCount) {
      throw new Error("Could not update designer rating");
    }
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
    const newItem = req.body;
    const desId = req.params.designerId;

    if (!newItem) {
      throw new Error("No item details");
    }
    const designersCol = db.collection("designersProducts");

    const result = {
      designerId: desId,
      ...newItem,
      onSale: true,
    };

    await designersCol.insertOne(result);
    res.status(200).json({ message: "successfully uploaded" });
  } catch (error) {
    console.error("Error creating new design: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//removing a designer product when a designer wants to remove it
app.delete("/removeDesignersProducts/:designerProductId", async (req, res) => {
  try {
    const desProdId = req.params.designerProductId;
    await db
      .collection("designersProducts")
      .deleteOne({ _id: new mongodb.ObjectId(desProdId) });
    res.status(200).json({ message: "successfully deleted" });
  } catch (error) {
    console.error("error deleting a designer's product", error);
    res.status(500).json({ error: "internal server error" });
  }
});

//updating details for a specific designer products
app.put("/editDesignerProductDetails/:designerProductId", async (req, res) => {
  try {
    const desProdId = req.params.designerProductId;
    const updates = req.body;

    const result = await db
      .collection("designersProducts")
      .updateOne(
        { _id: new mongodb.ObjectId(desProdId) },
        { $set: { ...updates } }
      );

    if (result.matchedCount) {
      res.status(200).json({ message: "successfully updated" });
    } else {
      throw new Error("could not update product");
    }
  } catch (error) {
    console.error("error updating product", error);
    res.status(500).json({ error: "internal server error" });
  }
});

app.get("/designersContactInfo", async (req, res) => {
  try {
    const result = await db
      .collection("designers")
      .find(
        {},
        {
          projection: {
            name: 1,
            surname: 1,
            phoneNumber: 1,
            email: 1,
            gender: 1,
            pfpPath: 1,
            rating: 1,
          },
        }
      )
      .toArray();
    if (!result) {
      res.status(400), json({ message: "user not found" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("error getting designer's products", error);
    res.status(500).json({ message: "internal server error" });
  }
});

app.put("/editDesignerInfo/:designerId", async (req, res) => {
  try {
    const id = req.params.designerId;
    const { phoneNumber, pfpPath } = req.body;
    const result = await db
      .collection("designers")
      .updateOne(
        { _id: new mongodb.ObjectId(id) },
        { $set: { phoneNumber, pfpPath } }
      );

    result
      ? res.status(200).json({ message: "successful" })
      : res
          .status(400)
          .json({ error: "could not update profile, user not found" });
  } catch (error) {
    console.error("error updating profile", error);
    res.status(500).json({ message: "internal server error" });
  }
});

app.post("/SendDesignToCustomer/:designerId", async (req, res) => {
  let status = 500;
  let message = "Internal server error";

  try {
    const invalid = (m = "invalid input") => {
      status = 401;
      message = m;
    };
    const designerId = req.params.designerId;

    const { customerEmail, name, uploadedBy, imagePath } = req.body;
    const customer = await db
      .collection("customers")
      .findOne({ email: customerEmail });

    if (!customer) {
      invalid("Customer not found");
      throw new Error("customer not found");
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const link = `http://${process.env.ElasticIP}:5000/confirmCartRequest?token=${token}`;

    await transporter.sendMail({
      from: "deesdesigns465@gmail.com",
      to: customerEmail,
      subject: "Confirm Designer Product Request",
      html: `
       <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #d07a7a, #e8b4b4); color: white; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-family: 'Playwrite US Modern', cursive; font-size: 2.4em; font-weight: 400; letter-spacing: 0.5px;">
        Dees Designs
      </h1>
      <p style="margin: 12px 0 0; font-size: 1.1em; opacity: 0.95;">Get DEE best for you!</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px 28px; color: #333; text-align: center;">

      <!-- Greeting -->
      <p style="font-size: 1.25em; margin: 0 0 16px; color: #444;">
        Hi <strong>${customer.name}</strong>,
      </p>

      <!-- Designer Request Message -->
      <p style="margin: 0 0 20px; font-size: 1.05em; line-height: 1.7;">
        Designer <strong style="color: #d07a7a;">${uploadedBy}</strong> has sent you a special request!
      </p>

      <!-- Product Image -->
      <div style="margin: 24px 0;">
        <img 
          src="${imagePath}" 
          alt="${name}" 
          width="100%" 
          style="max-width: 420px; height: auto; border-radius: 12px; box-shadow: 0 6px 16px rgba(0,0,0,0.1); display: block; margin: 0 auto; border: 1px solid #eee;"
        />
      </div>

      <!-- Product Name & Action -->
      <p style="margin: 20px 0 8px; font-size: 1.15em; font-weight: 600; color: #333;">
        "${name}"
      </p>

      <p style="margin: 0 0 28px; font-size: 1.05em; line-height: 1.7; color: #555;">
        They’d love for you to add this unique piece to your cart.
      </p>

      <!-- CTA Button -->
      <a href="${link}" 
         style="display: inline-block; background: #d07a7a; color: white; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-weight: 600; font-size: 1.1em; box-shadow: 0 4px 10px rgba(208, 122, 122, 0.3);">
        Add to Cart
      </a>

      <!-- Safety Note -->
      <p style="margin: 32px 0 0; font-size: 0.9em; color: #888; line-height: 1.6;">
        If you didn’t expect this request, you can safely ignore this email.<br>
        No action is required.
      </p>

      <!-- Closing -->
      <p style="margin: 32px 0 0; font-size: 1em; color: #666; line-height: 1.7;">
        Warm regards,<br>
        <strong style="color: #d07a7a;">The Dees Designs Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f4ecec; padding: 20px; text-align: center; font-size: 0.85em; color: #888;">
      <p style="margin: 0;">
        © 2025 Dees Designs. All rights reserved.<br>
        Handmade in South Africa with care and creativity
      </p>
    </div>
  </div>
</div>
      `,
    });

    const cartRequest = await db.collection("customerCartRequests").insertOne({
      designerId,
      customerId: customer._id.toString(),
      ...req.body,
      size: "M",
      quantity: 1,
      expiresAt,
      token,
    });

    res.status(200).send({ message: "succcessfully sent" });
  } catch (error) {
    console.error("Error sending email: ", error);
    res.status(status).json({ error: message });
  }
});

app.listen(port, "0.0.0.0", async () => {
  console.log(
    `The server has started on the link http://${process.env.ElasticIP}:${port}`
  );
  await connectToMongo();
});
