const User = require("../models/userModel");
const bcrypt = require("bcrypt");

const authController = {
    getRegister: (req, res) => {
        res.render('register');
    },

    getLogin: (req, res) => {
        res.render('login');
    },

    register: async (req, res) => {
        try {
            const { username, nama, alamat, noTelepon, password, role } = req.body;

            // Iki gawe validasi
            if (!username || !nama || !alamat || !noTelepon || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Semua field harus diisi'
                });
            }

            // Nge cek username
            const existingUser = await User.findOne({ 'akun.username': username });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username sudah digunakan'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Buat user baru
            const newUser = new User({
                akun: {
                    username,
                    nama,
                    alamat,
                    noTelepon,
                    password: hashedPassword,
                    role: role || 'pelanggan'
                }
            });

            await newUser.save();

            res.status(201).json({
                success: true,
                message: 'Registrasi berhasil'
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan saat registrasi'
            });
        }
    },
    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            const user = await User.findOne({ "akun.username": username });
            if (!user) {
                return res.status(400).send("Username atau password salah");
            }

            const validPassword = await bcrypt.compare(password, user.akun.password);
            if (!validPassword) {
                return res.status(400).send("Username atau password salah");
            }

            req.session.user = {
                _id: user._id,
                username: user.akun.username,
                role: user.akun.role,
                nama: user.akun.nama
            };

            if (user.akun.role === "admin" || user.akun.role === "petugas") {
                res.redirect("/produk");
            } else {
                res.redirect("/produk/pelanggan");
            }
        } catch (error) {
            console.error(error);
            res.status(500).send("Terjadi kesalahan saat login");
        }
    },

    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Gagal logout");
            }
            res.redirect("/auth/login");
        });
    }
}

module.exports = authController;