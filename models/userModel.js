const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    akun: {
        username: {
            type: String,
            required: true,
            unique: true,
        },
        nama: {
            type: String,
            required: true,
        },
        alamat: {
            type: String,
            required: true,
        },
        noTelepon: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['admin', 'petugas', 'pelanggan'],
            required: true,
        }
    }
});

module.exports = mongoose.model("User", userSchema);