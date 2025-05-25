const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Penjualan = require('../models/penjualanModel');
const DetailProduk = require('../models/detailProduk');
const Produk = require('../models/produkModel');
const Cart = require('../models/cartModel');

const processCheckout = async (req, res) => {
    try {
        if (!req.session.user) {
            throw new Error('User not logged in');
        }

        const cart = await Cart.findOne({ user_id: req.session.user._id });
        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        const totalBiaya = cart.items.reduce((total, item) =>
            total + (item.harga * item.quantity), 0);

        const penjualan = await Penjualan.create({
            tanggalPenjualan: new Date(),
            totalBiaya: totalBiaya,
            pelanggan_id: req.session.user._id
        });

        for (const item of cart.items) {
            await DetailProduk.create({
                id_penjualan: penjualan._id,
                id_produk: item.produkId,
                jumlah: item.quantity,
                total_harga: item.harga * item.quantity
            });

            // Update product stock
            // const produk = await Produk.findById(item.produkId);
            // if (produk) {
            //     produk.stok -= item.quantity;
            //     await produk.save();
            // }
        }

        req.session.lastTransaction = {
            id: penjualan._id,
            date: penjualan.tanggalPenjualan,
            items: cart.items,
            totalAmount: totalBiaya
        };

        // Clear cart
        cart.items = [];
        await cart.save();

        res.json({
            success: true,
            message: 'Checkout berhasil',
            penjualanId: penjualan._id
        });

    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({
            message: 'Error processing checkout',
            error: error.message
        });
    }
};

const downloadReceipt = async (req, res) => {
    try {
        const transactionId = req.params.transactionId;
        const transaction = req.session.lastTransaction;

        if (!transaction || transaction.id != transactionId) {
            throw new Error('Transaction not found');
        }

        const receiptDir = path.join(__dirname, '../public/receipts');
        if (!fs.existsSync(receiptDir)) {
            fs.mkdirSync(receiptDir, { recursive: true });
        }

        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        const filename = `receipt-${transactionId}.pdf`;
        const filePath = path.join(receiptDir, filename);
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        doc.fontSize(20).text('KASIR KITA', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('--------------------------------------------------------------------------------');
        doc.moveDown();

        doc.fontSize(12)
            .text(`Tanggal: ${transaction.date.toLocaleString()}`)
            .text(`No. Transaksi: ${transaction.id}`);

        doc.moveDown();

        doc.text('Produk                Qty    Harga         Total');
        doc.text('--------------------------------------------------------------------------------');

        transaction.items.forEach(item => {
            doc.text(
                `${item.nama_produk.substring(0, 20).padEnd(20)} ` +
                `${String(item.quantity).padEnd(6)} ` +
                `Rp ${item.harga.toString().padEnd(8)} ` +
                `Rp ${(item.harga * item.quantity).toString()}`
            );
        });

        doc.text('-------------------------------------------------------------------------------- +');
        doc.moveDown();
        doc.fontSize(14).text(`Total: Rp ${transaction.totalAmount}`, { align: 'right' });

        doc.moveDown(2);
        doc.fontSize(10).text('Terima kasih telah berbelanja!', { align: 'center' });

        doc.end();

        writeStream.on('finish', () => {
            res.download(filePath, filename, (err) => {
                if (err) {
                    console.error('Download error:', err);
                    return res.status(500).json({ message: 'Error downloading receipt' });
                }

                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('File cleanup error:', unlinkErr);
                });
            });
        });

        writeStream.on('error', (error) => {
            console.error('Write stream error:', error);
            res.status(500).json({ message: 'Error generating receipt' });
        });

    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).json({
            message: 'Error generating receipt',
            error: error.message
        });
    }
};

module.exports = {
    processCheckout,
    downloadReceipt
};