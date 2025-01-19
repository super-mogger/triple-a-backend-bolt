import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_GEZQfBnCrf1uyR',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'Z0GdpsZJIu2kRgp2cboJiBjM'
});

// Routes
app.post('/api/razorpay/createOrder', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount), // amount in paise
      currency,
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    };

    console.log('Creating order with options:', { ...options, amount: options.amount / 100 });

    const order = await razorpay.orders.create(options);
    console.log('Order created:', order);

    res.status(200).json({ 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      message: 'Error creating order',
      error: error.message
    });
  }
});

app.post('/api/razorpay/verify-payment', (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'Z0GdpsZJIu2kRgp2cboJiBjM')
      .update(text)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      res.json({ 
        verified: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      });
    } else {
      res.status(400).json({ 
        verified: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      verified: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});