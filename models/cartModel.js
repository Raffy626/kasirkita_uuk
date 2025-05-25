const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        produkId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Produk',
            required: true
        },
        nama_produk: String,
        harga: Number,
        quantity: Number
    }]
});

module.exports = mongoose.model('Cart', cartSchema);