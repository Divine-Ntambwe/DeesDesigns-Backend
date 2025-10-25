const chai = require("chai");
const chaiHttp = require("chai-http");
chai.use(chaiHttp.default);
const expect = chai.expect;
const { describe, it, before } = require("mocha");
const axios = require("axios");
const url = "http://localhost:5000";
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

describe("post a new customer", async () => {
  let userData;
  before(() => {
    userData = {
      name: `test`,
      surname: `user`,
      email: `testuser${Date.now()}@example.com`,
      mobileNumber: "0789898112",
      gender: "M",
      password: "Test123!",
      confirmPassword: "Test123!",
    };
  });
  it("post new customer", async () => {
    const res = await axios.post(`${url}/customersSignUp`, userData, {
      contentType: "application/json",
    });
    expect(res.status).equal(200);
  });

   it("post should not create new customer with existing email", async () => {
    try {
      const res = await axios.post(`${url}/customersSignUp`, {...userData,email:"divinentambwe28@gmail.com"}, {
        contentType: "application/json",
      });
      expect.fail("should not create customer");
    } catch (e) {
      expect(e.response).to.have.status(400);
      expect(e.response.data).to.have.property( "error", "User already exists please log in");
    }
   
  });

  it("post should not create new customer with invalid phone number", async () => {
    try {
      const res = await axios.post(`${url}/customersSignUp`, {...userData,mobileNumber:"07899002"}, {
        contentType: "application/json",
      });
      expect.fail("should not create customer");
    } catch (e) {
      expect(e.response).to.have.status(400);
      expect(e.response.data).to.have.property( "error", "Phone number is invalid");
    }
   
  });

   it("post should not create new customer with short password", async () => {
    try {
      const res = await axios.post(`${url}/customersSignUp`, {...userData,password:"9002"}, {
        contentType: "application/json",
      });
      expect.fail("should not create customer");
    } catch (e) {
      expect(e.response).to.have.status(400);
      expect(e.response.data).to.have.property( "error", "Password too short");
    }
   
  });

  it("post should not create new customer with invalid password", async () => {
    try {
      const res = await axios.post(`${url}/customersSignUp`, {...userData,password:"90020000"}, {
        contentType: "application/json",
      });
      expect.fail("should not create customer");
    } catch (e) {
      expect(e.response).to.have.status(400);
      expect(e.response.data).to.have.property( "error", "Password should include numbers and letters and symbols");
    }
   
  });

  it("post should not create new customer with mismatching passwords", async () => {
    try {
      const res = await axios.post(`${url}/customersSignUp`, {...userData,password:"12345678-K"}, {
        contentType: "application/json",
      });
      expect.fail("should not create customer");
    } catch (e) {
      expect(e.response).to.have.status(400);
      expect(e.response.data).to.have.property( "error", "Passwords do not match");
    }
   
  });
});

describe("posting a new designer", async () => {
  let testFilePath;
  let userData;
  before(() => {
    testFilePath = path.join(__dirname, "hk7xO3Zf.jpeg");
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, ".....");
    }
    userData = {
      name: "test",
      surname: "user",
      email: `test${Date.now()}@example.com`,
      phoneNumber: "0789898112",
      gender: "M",
      password: "Test123!",
      confirmPassword: "Test123!",
    };
  });

  it("should post new designer", async () => {
    let formData = new FormData();
    formData.append("pfp", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
    formData.append("details", JSON.stringify(userData));

    const res = await axios.post(
      `${url}/designersSignUp`,
      formData,

      { headers: formData.getHeaders() }
    );
    expect(res.status).equal(200);
  });

     it("post should not create new designer with existing email", async () => {
    try {
      let formData = new FormData();
    formData.append("pfp", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
    formData.append("details", JSON.stringify({...userData,email:"carmel@gmail.com"}));
      const res = await axios.post(`${url}/designersSignUp`, formData, {
        contentType: "application/json",
      });
      expect.fail("should not create designer");
    } catch (e) {
      expect(e.response).to.have.status(400);
      expect(e.response.data).to.have.property( "error", "User already exists please log in");
    }
   
  });

  // it("post should not create new designer with invalid phone number", async () => {
  //   try {
  //      let formData = new FormData();
  //   formData.append("pfp", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
  //   formData.append("details", JSON.stringify({...userData,phoneNumber:"977776655"}));
  //     const res = await axios.post(`${url}/designersSignUp`, formData, {
  //       contentType: "application/json",
  //     });
  //     expect.fail("should not create designer");
  //   } catch (e) {
  //     expect(e.response).to.have.status(400);
  //     expect(e.response.data).to.have.property( "error", "Phone number is invalid");
  //   }
   
  // });

  //  it("post should not create new designer with short password", async () => {
  //   try {
  //      let formData = new FormData();
  //   formData.append("pfp", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
  //   formData.append("details", JSON.stringify({...userData,password:"9002"}));
  //     const res = await axios.post(`${url}/designersSignUp`, formData, {
  //       contentType: "application/json",
  //     });
  //     expect.fail("should not create designer");
  //   } catch (e) {
  //     expect(e.response).to.have.status(400);
  //     expect(e.response.data).to.have.property( "error", "Password too short");
  //   }
   
  // });

  // it("post should not create new designer with invalid password", async () => {
  //   try {
  //      let formData = new FormData();
  //   formData.append("pfp", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
  //   formData.append("details", JSON.stringify({...userData,password:"900200000"}));
  //   const res = await axios.post(`${url}/designersSignUp`, formData, {
  //       contentType: "application/json",
  //     });
  //     expect.fail("should not create designer");
  //   } catch (e) {
  //     expect(e.response).to.have.status(400);
  //     expect(e.response.data).to.have.property( "error", "Password should include numbers and letters and symbols");
  //   }
   
  // });

  // it("post should not create new designer with mismatching passwords", async () => {
  //   try {
  //      let formData = new FormData();
  //   formData.append("pfp", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
  //   formData.append("details", JSON.stringify({...userData,password:"123456789-K"}));
  //   const res = await axios.post(`${url}/designersSignUp`, formData, {
  //       contentType: "application/json",
  //     });
  //     expect.fail("should not create designer");
  //   } catch (e) {
  //     expect(e.response).to.have.status(400);
  //     expect(e.response.data).to.have.property( "error", "Passwords do not match");
  //   }
   
  // });

});

describe("testing log in", async () => {
  let customer;
  let designer;
  before(() => {
    customer = {
      email: "divinentambwe28@gmail.com",
      password: "12345678-D",
    };
    designer = {
      email: "carmel@gmail.com",
      password: "12345678-C",
    };
  });
  it("should log customer in with correct credentials", async () => {
    const res = await axios.post(
      `${url}/userLogin`,
      { ...customer, isDesigner: false },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    expect(res.data).to.have.property("message", "successfully Logged In");
    expect(res.data).to.have.property("email", customer.email);
    expect(res).to.have.status(200);
  });

  it("should log designer in with correct credentials", async () => {
    const res = await axios.post(
      `${url}/userLogin`,
      { ...designer, isDesigner: true },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    expect(res.data).to.have.property("message", "successfully Logged In");
    expect(res.data).to.have.property("email", designer.email);
    expect(res.status).equal(200);
  });

  it("should not log in designer incorrect credentials", async () => {
    try {
      const res = await axios.post(
        `${url}/userLogin`,
        { email: designer.email, password: "123456789", isDesigner: true },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      expect.fail("should not log user in");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property("error", "incorrect password");
    }
  });

  it("should not log in customer incorrect credentials", async () => {
    try {
      const res = await axios.post(
        `${url}/userLogin`,
        { email: customer.email, password: "123456789", isDesigner: false },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      expect.fail("should not log user in");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property("error", "incorrect password");
    }
  });

  it("should not log customer in with non-existent email", async () => {
    try {
      const res = await axios.post(
        `${url}/userLogin`,
        { email: "test@nomail.com", password: "123456789", isDesigner: false },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      expect.fail("should not log user in");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property(
        "error",
        "Email does not exist please sign up"
      );
    }
  });

  it("should not log designer in with non-existent email", async () => {
    try {
      const res = await axios.post(
        `${url}/userLogin`,
        { email: "test@nomail.com", password: "123456789", isDesigner: true },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      expect.fail("should not log user in");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property(
        "error",
        "Email does not exist please sign up"
      );
    }
  });

  it("should not log customer in as a designer", async () => {
    try {
      const res = await axios.post(
        `${url}/userLogin`,
        { ...customer, isDesigner: true },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      expect.fail("should not log user in");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property(
        "error",
        "Email does not exist please sign up"
      );
    }
  });

  it("should not log customer in as a designer", async () => {
    try {
      const res = await axios.post(
        `${url}/userLogin`,
        { ...designer, isDesigner: false },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      expect.fail("should not log user in");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property(
        "error",
        "Email does not exist please sign up"
      );
    }
  });
});

describe("testing orders & cart endpoint", async () => {
  let product;
  let order;
  before(() => {
    product = {
  "customerId": "68a578a2ecef687c7aa2b1d9",
  "productId": "68a2db88d39fff0320a978b0",
  "productName": "Champagne Satin Evening Dress",
  "price": 870,
  "size": "S",
  "quantity": 1,
  "imgPath": "https://www.jovani.com/wp-content/uploads/0635A_BLUSHGOLD_1674-scaled.jpg",
  "productProvider": "stockProduct"

    };
  order={
  "customerId": "6887a25b7ca36fb9ab871bea",
  "address": {
    "streetAddress": "57 Hanilo Road",
    "suburb": "Alberton",
    "city": "Johannesburg",
    "postalCode": "2190"
  },
  "bankDetails": {
    "cardNumber": "1783990384822093",
    "cvv": "3820",
    "expiryDate": "2035-11-01"
  },
  "paymentMethod": "EFT",
  "purchasedProducts": [
    {
      "_id": "68a44f261ae54ce2c5b60109",
      "customerId": "6887a25b7ca36fb9ab871bea",
      "productId": "68a2db88d39fff0320a978a7",
      "productName": "Emerald Green Satin Gown",
      "price": 890,
      "size": "M",
      "quantity": 1,
      "imgPath": "https://www.jovani.com/wp-content/uploads/44524_EMERALD_8199.jpg",
      "productProvider": "stockProduct"
    }
  ],
  "totalAmount": "996.80",
}   
  });

  it("should post product to cart", async () => {
    const res = await axios.post(
      `${url}/addToCart`,
      product
      ,
      {
        headers: {
          "Content-Type": "application/json",
           Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
        },
      }
    );

    expect(res).to.have.status(200);
  });

    it("should post order", async () => {
    const res = await axios.post(
      `${url}/orders/68a578a2ecef687c7aa2b1d9`,
      order
      ,
      {
        headers: {
          "Content-Type": "application/json",
           Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
        },
      }
    );

    expect(res).to.have.status(200);
  });

  it("should not post order if credit card number is invalid", async () => {
    try {
      const res = await axios.post(
        `${url}/orders/68a578a2ecef687c7aa2b1d9`,
        { ...order,bankDetails:{...order.bankDetails,cardNumber:"1234 1234 1234 123"} },
        {
          headers: {
            "Content-Type": "application/json",
             Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`

          },
        }
      );

      expect.fail("should not post order");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property(
        "error",
        "invalid card number"
      );
    }
  }); 

  it("should not post order if card expiry date has is passed", async () => {
    try {
      const res = await axios.post(
        `${url}/orders/68a578a2ecef687c7aa2b1d9`,
        { ...order,bankDetails:{...order.bankDetails,expiryDate:new Date("01/02/2025")} },
        {
          headers: {
            "Content-Type": "application/json",
             Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`

          },
        }
      );

      expect.fail("should not post order");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property(
        "error",
        "Credit card is already expired" 
      );
    }
  }); 

  it("should not post order if cvv is invalid", async () => {
    try {
      const res = await axios.post(
        `${url}/orders/68a578a2ecef687c7aa2b1d9`,
        { ...order,bankDetails:{...order.bankDetails,cvv:"12334"} },
        {
          headers: {
            "Content-Type": "application/json",
             Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`

          },
        }
      );

      expect.fail("should not post order");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property(
        "error",
        "Invalid CVV number" 
      );
    }
  }); 

  it("should not post order if product isn't available", async () => {
    try {
      const res = await axios.post(
        `${url}/orders/68a578a2ecef687c7aa2b1d9`,
        { ...order,purchasedProducts:[...order.purchasedProducts,{...order.purchasedProducts[0],quantity:9000}] },
        {
          headers: {
            "Content-Type": "application/json",
             Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`

          },
        }
      );

      expect.fail("should not post order");
    } catch (e) {
      expect(e.status).equal(400);
      expect(e.response.data).to.have.property(
        "error",
        "The product " +
            order.purchasedProducts[0].productName +
            " is no longer available in the quantity you want" 
      );
    }
  });
});

describe("testing post reviews", async () => { 
  let review; 
  before(() => {
    review=
      {
  "name": "Britney",
  "surname": "Nunes",
  "productId": "68a2db88d39fff0320a978b0",
  "review": "Lovely Dress",
  "rating": 5
    }
  });

  it("should post a review for a product", async () => {
    const res = await axios.post(
        `${url}/uploadReview/68a578a2ecef687c7aa2b1d9`,
        review,
        {
          headers: {
            "Content-Type": "application/json",
             Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`

          },
        }
      );
    expect(res.status).equal(200);

  });

    it("should post a review for a designer", async () => {
    const res = await axios.post(
        `${url}/uploadReviewForDesigner`,
        {...review,productId:"688644adb7cb9cc43fe63b39"},
        {
          headers: {
            "Content-Type": "application/json",
             Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`

          },
        }
      );
    expect(res.status).equal(200);

  });
})

describe("testing product upload endpoint",async ()=>{
  let designerProduct;
  let customerProduct;
  before(()=>{
    designerProduct={
  "name": "Green Satin Dress",
  "price": "2500",
  "productDescription": "Waist:\"38cm\", Length:\"188cm\", Hips:\"44cm\", Chest:42cm",
  "categories": [
    "Women",
    "Graduation"
  ],
  "onSale": true,
  "uploadedBy": "Carmel Ngoyi",
  "designerEmail": "carmel@gmail.com",
    }
    customerProduct={
  "name": "Custom Blue Gown",
  "price": "3200",
  "uploadedBy": "Carmel Ngoyi",
  "customerEmail":"divinentambwe28@gmail.com"
}  

     testFilePath = path.join(__dirname, "hk7xO3Zf.jpeg");
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, ".....");
    }


  })
  it("should post new designer product", async () => {
    let formData = new FormData();
    formData.append("productImage", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
    formData.append("details", JSON.stringify(designerProduct));

    const res = await axios.post(
      `${url}/uploadDesignersProduct/68a5866104bda72911928fa7`,
      formData,

      { headers: {...formData.getHeaders() ,
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`
      }
      }
    );
    expect(res.status).equal(200);
  });

  it("should send email to customer and post product in cart requests", async () => {
    let formData = new FormData();
    formData.append("custProductImage", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
    formData.append("details", JSON.stringify(customerProduct));

    const res = await axios.post(
      `${url}/SendDesignToCustomer/68a5866104bda72911928fa7`,
      formData,

      { headers: {...formData.getHeaders() ,
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`
      }
      }
    );
    expect(res.status).equal(200);
  });

  it("should post product in cart request and not send mail with non-existent email", async () => {
    let formData = new FormData();
    formData.append("custProductImage", fs.createReadStream("./api-test/hk7xO3Zf.jpeg"));
    formData.append("details", JSON.stringify({...customerProduct,customerEmail:"testNone@nomail.com"}));

    try{

      const res = await axios.post(
        `${url}/SendDesignToCustomer/68a5866104bda72911928fa7`,
        formData,
  
        { headers: {...formData.getHeaders() ,
          Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`
        }
        }
      );
      expect.fail("should not send email");
    }catch(e){
      expect(e.response).to.have.status(400);
      expect(e.response.data).to.have.property("error","Customer not found" );
    }
  });




})