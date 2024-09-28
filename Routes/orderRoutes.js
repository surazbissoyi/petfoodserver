const express = require('express');
const router = express.Router();
const Order = require('../Models/Order'); // Import the Order schema

// Route to save a new order
router.post('/create_order', async (req, res) => {
    console.log(req.body);
    try {
        const { address, products, totalAmount, paymentDetails } = req.body;

        const newOrder = new Order({
            address,
            products,
            totalAmount,
            paymentStatus: 'Completed', // Payment successful
            paymentDetails
        });

        const savedOrder = await newOrder.save();

        res.status(200).json({ success: true, order: savedOrder });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Error creating order', error });
    }
});

router.get('/all', async (req, res) => {
    try {
        const orders = await Order.find(); // Fetch all orders from the database
        res.status(200).json(orders); // Send the orders as a JSON response
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: 'Failed to retrieve orders' });
    }
});


router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: status }, { new: true });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;
