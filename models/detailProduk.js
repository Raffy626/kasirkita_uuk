const mongoose = require('mongoose');

const detailProdukSchema = new mongoose.Schema({
    id_penjualan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Penjualan',
        required: true
    },
    id_produk: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produk',
        required: true
    },
    jumlah: {
        type: Number,
        required: true
    },
    total_harga: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('DetailProduk', detailProdukSchema);