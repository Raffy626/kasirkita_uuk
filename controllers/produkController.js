const Produk = require('../models/produkModel');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const produkController = {
    getDaftarProduk: async (req, res) => {
        try {
            const produkList = await Produk.find();
            res.render('daftarProduk', { produkList });
        } catch (error) {
            console.error('Error fetching produk list:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    getTambahProduk: (req, res) => {
        try {
            res.render('tambahProduk', { produk: {} });
        } catch (error) {
            console.error('Error rendering tambah produk:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    getEditProduk: async (req, res) => {
        try {
            const produkId = req.params.id.trim();
            const produk = await Produk.findById(produkId);
            res.render('formEditProduk', { produk });
        } catch (error) {
            console.error("error fetching product: ", error);
            res.status(500).send("Internal Server Error");
        }
    },

    editProduk: async (req, res) => {
        try {
            const produkId = req.params.id.trim();
            const { nama_produk, kategori, harga, stok} = req.body;
            const fotoPath = req.file ? req.file.filename : null;

            //Cari product bedasarkan Id
            const produk = await Produk.findById(produkId);
            if (!produk) {
                return res.status(404).send("Produk tidak ada Di dalam toko");
            }

            if (fotoPath && produk.foto) {
                const oldImagePath = path.join(__dirname, '/public/image', produk.foto);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
            }

            //Update hanya jika ada input baru,jika kosong tetap pakai nilai lama
            produk.kategori = kategori || produk.kategori;
            produk.nama_produk = nama_produk || produk.nama_produk;
            produk.harga = harga || produk.harga;
            produk.stok = stok || produk.stok;
            produk.foto = fotoPath || produk.foto;

            //simpan perubahan ke database
            await produk.save();
            res.redirect('/produk');

        } catch (error) {
            console.error("Error editing product: ", error);
            res.status(500).send("Internal Server error");
        }
    },

    tambahProduk: async (req, res) => {
        try {
            const { nama_produk, kategori, harga, stok } = req.body;
            const fotoPath = req.file ? req.file.filename : null;

            const produk = new Produk({
                foto: fotoPath,
                nama_produk,
                kategori,
                harga,
                stok
            });

            await produk.save();
            res.redirect('/produk');
        } catch (error) {
            console.error('Error adding produk:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    deleteProduk: async (req, res) => {
        try {
            const produkId = req.params.id.trim();

            if (!mongoose.Types.ObjectId.isValid(produkId)) {
                return res.status(400).send('ID tidak valid');
            }

            const produk = await Produk.findById(produkId);
            if (!produk) {
                return res.status(404).send('Produk tidak ditemukan');
            }

            if (produk.foto) {
                const imagePath = path.join(__dirname, '../public/image', produk.foto);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            await Produk.findByIdAndDelete(produkId);
            res.redirect('/produk');
        } catch (error) {
            console.error('Error deleting produk:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    getDaftarProdukPelanggan: async (req, res) => {
        try {
            const produkList = await Produk.find();
            res.render('daftarProdukPelanggan', { produkList });
        } catch (error) {
            console.error('Error fetching produk for pelanggan:', error);
            res.status(500).send('Internal Server Error');
        }
    }
};

module.exports = produkController;