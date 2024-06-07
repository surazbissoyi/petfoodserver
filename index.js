const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

app.use(express.json());
app.use(cors());

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'upload/images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Database connection with MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

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

    const imageUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
    res.json({
        success: 1,
        image_url: imageUrl
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
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
});

app.post('/addproduct', async (req, res) => {
    try {
        let products = await Product.find({});
        let id;

        if (products.length > 0) {
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
        });

        console.log(product);
        await product.save();
        console.log("Saved");
        res.json({
            success: true,
            name: req.body.name
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/removeproduct', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.body.id });
        console.log("Removed");
        res.json({
            success: true,
            name: req.body.name
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        console.log("All products fetched");
        res.send(products);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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
});

app.post('/signup', async (req, res) => {
    try {
        let check = await User.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({ success: false, errors: "Existing user found with same email address" });
        }
        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }
        const user = new User({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            cartData: cart
        });
        await user.save();

        const data = {
            user: {
                id: user.id
            }
        };
        const token = jwt.sign(data, process.env.JWT_SECRET);
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            const passMatch = req.body.password === user.password;
            if (passMatch) {
                const data = {
                    user: {
                        id: user.id
                    }
                };
                const token = jwt.sign(data, process.env.JWT_SECRET);
                res.json({ success: true, token });
            } else {
                res.json({ success: false, errors: "Wrong Password" });
            }
        } else {
            res.json({ success: false, errors: "Wrong Email address" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/newcollections', async (req, res) => {
    try {
        let products = await Product.find({});
        let newcollection = products.slice(1).slice(-8);
        console.log("New collection Fetched");
        res.send(newcollection);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/popularproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        let popularproducts = products.slice(0, 4);
        console.log("Popular Products fetched");
        res.send(popularproducts);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using valid login" });
    } else {
        try {
            const data = jwt.verify(token, process.env.JWT_SECRET);
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({ errors: "Please authenticate using a valid token" });
        }
    }
};

// Endpoint for adding products to cartData
app.post('/addtocart', fetchUser, async (req, res) => {
    try {
        console.log("Removed", req.body.itemId);
        let userData = await User.findOne({ _id: req.user.id });
        userData.cartData[req.body.itemId] += 1;
        await User.findOneAndUpdate({ _id: req.user.id },
