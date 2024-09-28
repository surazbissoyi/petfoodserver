const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    address: {
        name: String,
        email: String,
        contact: String,
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    products: [
        {
            id: String,
            name: String,
            new_price: Number,
            quantity: Number
        }
    ],
    totalAmount: Number,
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    paymentDetails: {
        razorpay_order_id: String,
        razorpay_payment_id: String,
        razorpay_signature: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);
