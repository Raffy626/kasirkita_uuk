const mongoose = require('mongoose');

const pelangganSchema = new mongoose.Schema({
    nama: {
        type: String,
        required: true,
    },
    alamat: {
        type: String,
        required: true
    },
    nomor_telepon: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('User', pelangganSchema);