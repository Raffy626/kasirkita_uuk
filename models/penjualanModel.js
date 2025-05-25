const mongoose = require('mongoose');

const penjualanSchema = new mongoose.Schema({
    tanggalPenjualan: {
        type: Date,
        required: true,
        default: Date.now
    },
    totalBiaya: {
        type: Number,
        required: true
    },
    pelanggan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

module.exports = mongoose.model('Penjualan', penjualanSchema);