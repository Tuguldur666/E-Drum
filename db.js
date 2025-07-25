const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://hulanotgonbayar12:ujXWAj5kDnMD6zF@cluster0.m3rdvqe.mongodb.net/')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));