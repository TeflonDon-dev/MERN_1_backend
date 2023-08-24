const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Stripe = require("stripe");


require("dotenv").config()

const app = express();

app.use(cors())

app.use(express.json({limit:"10mb"}))



const PORT = process.env.port || 8080



mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('connected to database'))
    .catch((err) => console.log(err.message))
    
    //schema

const userSchema = mongoose.Schema({
        firstName: String,
        lastName:String,
    email: {
        type: String,
        unique:true
        },
        password: String,
        confirmPassword:String,
        image: String
})
   


//model
const userModel=mongoose.model("user",userSchema)

app.get("/", (req, res) => {
    res.send("server is running smoothly")
})


app.post("/signup", async (req, res) => {
    console.log(req.body);

    const { email } = req.body
    
    let user = await userModel.findOne({ email:email })
    if (user) {
   
        res.send({message:"user already exists...",alert:false});
        
    } else {
        
        user =  userModel(req.body)
        const save = await user.save()
        res.send({message:'succcessfully signed up',alert:true})
    }
        
    
})

app.post("/login",async (req, res) => {
    // console.log(req.body)
    const { email } = req.body
    
    let user = await userModel.findOne({ email: email })
    
    if (user) {
        const dataSend = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: user.image,
      };
    //   console.log(dataSend);
        res.send({message:"login successfully... ",alert:true, data: dataSend,});
        
    } else {
           res.send({message:'email is not available, please sign up...',alert:false})
    }
})

//product section

const schemaProduct = mongoose.Schema({
     name: String,
    category:String,
    image: String,
    price: String,
    description:String
});

const productModel = mongoose.model("product", schemaProduct);

//save product in database

app.post("/uploadproduct", async(req, res) => {
    // console.log(req.body);
    const data = productModel(req.body);
    const saveData = await data.save();
    res.send({ message: "upload successfully" });
})

app.get("/product", async(req, res) => {
    const data =await productModel.find({})
    res.send(JSON.stringify(data));
})

//payment gateway
console.log(process.env.STRIPE_SECRET_KEY);

const stripe=new Stripe(process.env.STRIPE_SECRET_KEY)

app.post("/checkout-payment", async (req, res) => {
    // console.log(req.body);
    try {
        
        const params = {
            submit_type: "pay",
            mode: "payment",
            payment_method_types: ['card'],
            billing_address_collection: "auto",
            shipping_options: [{ shipping_rate: "shr_1NiDqSCxp6HsbLJiMRxHRIuN" }],
            
           line_items : req.body.map((item)=>{
            return{
              price_data : {
                currency : "usd",
                product_data : {
                  name : item.name,
                  // images : [item.image]
                },
                unit_amount : item.price * 100,
              },
              adjustable_quantity : {
                enabled : true,
                minimum : 1,
              },
              quantity : item.qty
            }
           }),

           success_url:`${process.env.FRONTEND_URL}/success`,
           cancel_url:`${process.env.FRONTEND_URL}/cancel`
        }
      
        const session = await stripe.checkout.sessions.create(params)
        res.status(200).json(session.id)
    } catch (err) {
        res.status(err.statusCode||500).json(err.message)
    }
})

app.listen(PORT,()=>console.log(`server is running on port ${PORT}`))