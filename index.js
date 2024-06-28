const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const { type } = require("os");
require('dotenv').config()

app.use(express.json());
app.use(cors());

// Ensure upload directory exists
const uploadDir = './upload/images';
try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Upload directory created successfully");
} catch (err) {
    if (err.code !== 'EEXIST') {
        console.error("Error creating upload directory:", err);
        process.exit(1);
    }
}

// Database connection with MongoDB
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:" + err));

// API creation
app.get("/", (req, res) => {
    res.send("Express is running");
});

// Image storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// Creating upload endpoint for images
app.use('/images', express.static(uploadDir));
app.post('/upload', upload.single('product'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: 0,
            message: "No file uploaded"
        });
    }

    res.json({
        success: 1,
        image_url: `https://petfoodserver.onrender.com/images/${req.file.filename}`
    });
});

// Schema for creating products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now(),
    },
    available: {
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct', async(req, res) => {
    let products = await Product.find({});
    let id;

    if(products.length > 0) {
        let last_product = products[products.length - 1];
        id = last_product.id + 1;
    } else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price
    })

    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name
    })
})

// creating api to add products
app.post('/removeproduct', async(req, res) => {
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name
    })
})

// creating api to get all products
app.get('/allproducts', async(req, res) => {
    let products = await Product.find({});
    console.log("All products fetched");
    res.send(products);
})

// Schema user model
const User = mongoose.model('User', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now
    }
})

// Creating endpoint for registration the user
app.post('/signup', async (req, res) => {
    let check = await User.findOne({email: req.body.email});
    if(check) {
        return res.status(400).json({success: false, errors: "Existing user found with same email address"})
    }
    let cart = {};
    for(let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new User({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart
    })
    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }
    const token = jwt.sign(data, 'secret_ecom');
    res.json({success: true, token})
})

// creating endpoint for user login
app.post('/login', async (req, res) => {
    let user = await User.findOne({email:req.body.email});
    if(user) {
        const passMatch = req.body.password === user.password;
        if (passMatch) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({success: true,  token});
        } else {
            res.json({success: false, errors:"Wrong Password"});
        }
    } else {
        res.json({success: false, errors: "Wrong Email address"})
    }
})

// creating endpoint for latestproduct
app.get('/newcollections', async(req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("Newcollection Fetched")
    res.send(newcollection)
})

// creating endpoint for popular products
app.get('/popularproducts', async(req, res) => {
    let products = await Product.find({});
    let popularproducts = products.slice(0,4);
    console.log("popular Products fetched");
    res.send(popularproducts);
})

// creating middlewear to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if(!token) {
        res.status(401).send({errors: "Please authenticate using valid login"})
    } else {
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({errors: "please authenticate using a valid token"});
        }
    }
}

// creating endpoint for adding peoducts in cartdata
app.post('/addtocart', fetchUser, async(req, res) => {
    console.log("Removed", req.body.itemId);
    let userData = await User.findOne({_id: req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await User.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
    res.send("Added");
})

// creating endpoint for removing cartData
app.post('/removefromcart', fetchUser, async(req, res) => {
    console.log("Removed", req.body.itemId);
    let userData = await User.findOne({_id: req.user.id});
    if (userData.cartData[req.body.itemId] > 0)
        userData.cartData[req.body.itemId] -= 1;
        await User.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
    res.send("Added");
})

// creating endpoint to get cart data
app.post('/getcart', fetchUser, async(req, res) => {
    console.log("Get cart");
    let userData = await User.findOne({_id: req.user.id});
    res.json(userData.cartData);
})

const Order = mongoose.model("Order", {
    orderId: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    products: [{
        productId: {
            type: Number,
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        productPrice: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    date: {
        type: Date,
        default: Date.now
    }
});

app.post('/addorder', async (req, res) => {
    let orders = await Order.find({});
    let orderId;

    if (orders.length > 0) {
        let lastOrder = orders[orders.length - 1];
        orderId = lastOrder.orderId + 1;
    } else {
        orderId = 1;
    }

    const order = new Order({
        orderId: orderId,
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        products: req.body.products
    });

    console.log(order);
    await order.save();
    console.log("Order saved");
    res.json({
        success: true,
        orderId: orderId
    });
});


// Start the server
app.listen(port, (error) => {
    if (!error) {
        console.log("Server is running on port " + port);
    } else {
        console.error("Error:", error);
    }
});
