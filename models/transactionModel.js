const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    items: [{
        produkId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Produk',
            required: true
        },
        nama_produk: String,
        harga: Number,
        quantity: Number,
        subtotal: Number
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    transactionDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);