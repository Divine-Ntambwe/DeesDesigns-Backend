const chai = require("chai");
const chaiHttp = require("chai-http");
chai.use(chaiHttp.default);
const expect = chai.expect;
const axios = require("axios");
const url = "http://localhost:5000";


describe("Get Requests", () => {

  it("confirm cartRequests", async () => {
    const res = await axios.get(`${url}/confirmCartRequest`,{
  params: { token: "999200e67126e3a49c8987a8e7ba57a3341a88dd"} 
});
expect(res.status).equal(200);
  });

    

 

  it("get all products",async () => {
    const res = await axios.get(url+"/stockProducts",

   {headers: {"Authorization":`Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`}})
  
    
      expect(res.status).equal(200)
    
      
    });
  

  it("get all products on sale", async () => {
    const res = await axios.get(`${url}/allDesignerProducts`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });
    res.data.map((product) => {
      expect(product).to.have.property("onSale", true);
    });
  });

  it("get all reviews for a product with many reviews", async () => {
    const res = await axios.get(`${url}/reviews/68a2db88d39fff0320a978a7`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });
    res.data.map((product) => {
      expect(product).to.have.property("productId", "68a2db88d39fff0320a978a7");
    });
  });

  it("get reviews for product with no reviews", async () => {
    const res = await axios.get(`${url}/reviews/68c02e8db0000dd0b2d27202`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });

    expect(res.data).equal("No reviews yet");
  });

   it("get all reviews for a designer with many reviews", async () => {
    const res = await axios.get(`${url}/designerReviews/68a5866104bda72911928fa7`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });
    res.data.map((product) => {
      expect(product).to.have.property("designerId", "68a5866104bda72911928fa7");
    });
  });

   it("get reviews for a designer with no reviews", async () => {
    const res = await axios.get(`${url}/reviews/68e68d68593277b4bbd76ba3`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });

    expect(res.data).equal("No reviews yet");
  });

  it("get cart items for a customer", async () => {
    const res = await axios.get(`${url}/cart/68a578a2ecef687c7aa2b1d9`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });
     res.data.map((item) => {
      expect(item).to.have.property("customerId", "68a578a2ecef687c7aa2b1d9");
    });
  });

  it("get all orders for a customer with accurate mock tracking details", async () => {
    const res = await axios.get(`${url}/customerOrders/68a578a2ecef687c7aa2b1d9`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });
     res.data.map((order) => {
      expect(order).to.have.property("customerId", "68a578a2ecef687c7aa2b1d9");

      const daysInProcess =
      new Date(order.dateOfDelivery - order.dateOfPurchase).getDate() - 2;

      if (
        Date.parse(new Date()) <=
          Date.parse(`1970/01/${daysInProcess}`) +
            Date.parse(order.dateOfPurchase) &&
        new Date().toDateString() !== order.dateOfPurchase.toDateString()
      ) {
        expect(order.statusOfExchange).equal("is being processed")
      }

      if (
        new Date().toDateString() ===
        new Date(
          Date.parse(`1970/01/${daysInProcess + 1}`) +
            Date.parse(order.dateOfPurchase)
        ).toDateString()
      ) {
         expect(order.statusOfExchange).equal("in transit")
      }

       if (
        new Date().toDateString() ===
        new Date(
          Date.parse(`1970/01/${daysInProcess + 2}`) +
            Date.parse(order.dateOfPurchase)
        ).toDateString()
      ) {
         expect(order.statusOfExchange).equal("has hit the road!")
      }

      if (
        Date.parse(new Date()) >=
          Date.parse(`1970/01/${daysInProcess + 3}`) +
            Date.parse(order.dateOfPurchase) &&
        new Date().toDateString() !== order.dateOfPurchase.toDateString()
      ) {
         expect(order.statusOfExchange).equal("delivered")
      }

     

    });

  });

  it("get all products uploaded by a designer", async () => {
    const res = await axios.get(`${url}/designersProducts/68a5866104bda72911928fa7`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });
     res.data.map((item) => {
      expect(item).to.have.property("designerId", "68a5866104bda72911928fa7");
    });
  });

  it("get designers contact info", async () => {
    const res = await axios.get(`${url}/designersContactInfo`, {
      headers: {
        Authorization: `Basic ZGl2aW5lbnRhbWJ3ZTI4QGdtYWlsLmNvbTpNVEl6TkRVMk56Z3RSQT09`,
      },
    });
  });

});
