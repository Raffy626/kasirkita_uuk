const Penjualan = require('../models/penjualanModel');
const Produk = require('../models/produkModel');
const Cart = require('../models/cartModel');

const penjualanController = {
    addToCart: async (req, res) => {
        try {
            const produkId = req.params.id;
            const userId = req.session.user._id;

            const produk = await Produk.findById(produkId);
            if (!produk) {
                return res.status(404).json({
                    success: false,
                    message: 'Produk tidak ditemukan'
                });
            }

            if (produk.stok <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Stok produk habis'
                });
            }

            produk.stok = produk.stok - 1;
            await produk.save();

            let cart = await Cart.findOne({ user_id: userId });
            if (!cart) {
                cart = new Cart({
                    user_id: userId,
                    items: []
                });
            }

            const existingItem = cart.items.find(item =>
                item.produkId.toString() === produkId
            );

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.items.push({
                    produkId: produkId,
                    nama_produk: produk.nama_produk,
                    harga: produk.harga,
                    quantity: 1
                });
            }

            await cart.save();

            return res.json({
                success: true,
                message: 'Produk berhasil ditambahkan ke keranjang',
                newStok: produk.stok
            });

        } catch (error) {
            console.error('Error adding to cart:', error);
            return res.status(500).json({
                success: false,
                message: 'Error adding to cart'
            });
        }
    },

    cancelItem: async (req, res) => {
        try {
            const produkId = req.params.id;
            const userId = req.session.user._id;

            const cart = await Cart.findOne({ user_id: userId });
            if (!cart) {
                return res.status(404).send('Cart tidak ditemukan');
            }

            const cartItem = cart.items.find(item =>
                item.produkId.toString() === produkId
            );

            if (!cartItem) {
                return res.status(404).send('Item tidak ditemukan di keranjang');
            }

            const produk = await Produk.findById(produkId);
            if (produk) {
                produk.stok += cartItem.quantity;
                await produk.save();
            }

            cart.items = cart.items.filter(item =>
                item.produkId.toString() !== produkId
            );
            await cart.save();

            res.redirect('/penjualan');
        } catch (error) {
            console.error('Error canceling item:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    getDaftarPenjualan: async (req, res) => {
        try {
            const userId = req.session.user._id;
            const cartData = await Cart.findOne({ user_id: userId });
            let cart = [];
            let totalBiaya = 0;

            if (cartData && cartData.items.length > 0) {
                cart = cartData.items;
                totalBiaya = cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
            }

            res.render('daftarPenjualan', {
                cart,
                totalBiaya
            });
        } catch (error) {
            res.render('daftarPenjualan', {
                cart: [],
                totalBiaya: 0,
                error: 'Gagal mengambil data keranjang'
            });
        }
    }
};

module.exports = penjualanController;