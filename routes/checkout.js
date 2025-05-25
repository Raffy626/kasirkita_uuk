const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const Penjualan = require('../models/penjualanModel');
const Cart = require('../models/cartModel');
const DetailProduk = require('../models/detailProduk');
const PDFDocument = require('pdfkit');

router.get('/produk/:id', async (req, res) => {
    try {
        const penjualan = await Penjualan.findById(req.params.id);
        const details = await DetailProduk.find({ id_penjualan: req.params.id })
            .populate('id_produk');

        if (!penjualan) {
            return res.status(404).send('Transaksi tidak ditemukan');
        }

        const items = details.map(detail => ({
            nama_produk: detail.id_produk.nama_produk,
            quantity: detail.jumlah,
            harga: detail.id_produk.harga
        }));

        res.render('checkoutProduk', { 
            transactionId: penjualan._id,
            totalAmount: penjualan.totalBiaya,
            items: items,
            success: true,
            message: 'Checkout berhasil'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan saat memuat detail checkout');
    }
});

router.post('/', async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cart = await Cart.findOne({ user_id: userId });
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Keranjang kosong' });
        }

        // Buat record penjualan baru
        const penjualan = new Penjualan({
            pelanggan_id: userId,
            tanggalPenjualan: new Date(),
            totalBiaya: cart.items.reduce((total, item) => total + (item.harga * item.quantity), 0)
        });

        await penjualan.save();

        // Simpan detail produk
        for (const item of cart.items) {
            const detail = new DetailProduk({
                id_penjualan: penjualan._id,
                id_produk: item.produkId,
                jumlah: item.quantity,
                total_harga: item.harga * item.quantity
            });
            await detail.save();
        }

        // Kosongkan keranjang
        await Cart.deleteOne({ user_id: userId });

        // Ubah response ini
        res.json({ 
            success: true, 
            message: 'Checkout berhasil',
            transactionId: penjualan._id // Tambahkan ID transaksi
        });
    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ message: 'Checkout gagal' });
    }
});

router.get('/download-receipt/:id', async (req, res) => {
    try {
        const penjualan = await Penjualan.findById(req.params.id);
        const details = await DetailProduk.find({ id_penjualan: req.params.id })
            .populate('id_produk');

        if (!penjualan) {
            return res.status(404).send('Transaksi tidak ditemukan');
        }

        // Buat PDF
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${penjualan._id}.pdf`);
        
        // Pipe PDF ke response
        doc.pipe(res);
        
        // Header
        doc.fontSize(24).text('KASIR KITA', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(16).text('Struk Pembelian', { align: 'center' });
        doc.moveDown();

        // Garis pembatas
        doc.moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .stroke();
        doc.moveDown();

        // Informasi transaksi
        doc.fontSize(12);
        doc.text(`ID Transaksi : ${penjualan._id}`);
        doc.text(`Tanggal     : ${new Date(penjualan.tanggalPenjualan).toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`);
        doc.moveDown();

        // Header tabel
        let startX = 50;
        let startY = doc.y;
        let colWidth = {
            no: 30,
            nama: 250,
            jumlah: 60,
            harga: 80,
            total: 80
        };
        
        doc.font('Helvetica-Bold');
        doc.text('No', startX, startY);
        doc.text('Nama Produk', startX + colWidth.no, startY);
        doc.text('Jumlah', startX + colWidth.no + colWidth.nama, startY, { width: colWidth.jumlah, align: 'right' });
        doc.text('Harga', startX + colWidth.no + colWidth.nama + colWidth.jumlah, startY, { width: colWidth.harga, align: 'right' });
        doc.text('Total', startX + colWidth.no + colWidth.nama + colWidth.jumlah + colWidth.harga, startY, { width: colWidth.total, align: 'right' });
        
        // Garis pembatas header tabel
        doc.moveDown();
        doc.moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .stroke();
        doc.moveDown();

        // Isi tabel
        doc.font('Helvetica');
        let totalKeseluruhan = 0;
        details.forEach((detail, index) => {
            const y = doc.y;
            const total = detail.jumlah * detail.id_produk.harga;
            totalKeseluruhan += total;

            doc.text((index + 1).toString(), startX, y);
            doc.text(detail.id_produk.nama_produk, startX + colWidth.no, y);
            doc.text(detail.jumlah.toString(), startX + colWidth.no + colWidth.nama, y, { width: colWidth.jumlah, align: 'right' });
            doc.text(`Rp ${detail.id_produk.harga.toLocaleString('id-ID')}`, startX + colWidth.no + colWidth.nama + colWidth.jumlah, y, { width: colWidth.harga, align: 'right' });
            doc.text(`Rp ${total.toLocaleString('id-ID')}`, startX + colWidth.no + colWidth.nama + colWidth.jumlah + colWidth.harga, y, { width: colWidth.total, align: 'right' });
            doc.moveDown();
        });

        // Garis pembatas total
        doc.moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .stroke();
        doc.moveDown();

        // Total keseluruhan
        doc.font('Helvetica-Bold');
        doc.text(
            `Total Keseluruhan: Rp ${totalKeseluruhan.toLocaleString('id-ID')}`,
            startX + colWidth.no + colWidth.nama,
            doc.y,
            { width: colWidth.jumlah + colWidth.harga + colWidth.total, align: 'right' }
        );
        doc.moveDown(2);

        // Footer
        doc.fontSize(10).font('Helvetica');
        doc.text('Terima kasih telah berbelanja di Kasir Kita', { align: 'center' });
        doc.text('Simpan struk ini sebagai bukti pembelian', { align: 'center' });
        
        // Finalize PDF
        doc.end();
        
    } catch (error) {
        console.error('Error generating receipt:', error);
        res.status(500).send('Terjadi kesalahan saat membuat struk');
    }
});

module.exports = router;