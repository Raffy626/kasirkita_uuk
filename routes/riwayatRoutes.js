const express = require('express');
const router = express.Router();
const Penjualan = require('../models/penjualanModel');
const DetailProduk = require('../models/detailProduk');
const checkSession = require('../middleware/checkSession');
const checkRole = require('../middleware/checkRole');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Update middleware untuk mengizinkan admin dan petugas untuk semua route
router.use(checkSession, checkRole(['admin', 'petugas']));

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
};

router.get('/', async (req, res) => {
    try {
        const penjualanList = await Penjualan.find()
            .populate({
                path: 'pelanggan_id',
                select: 'akun.nama akun.username',
                model: 'User'
            })
            .sort({ tanggalPenjualan: -1 });

        res.render('riwayatPenjualan', { penjualanList });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

router.get('/detail/:id', async (req, res) => {
    try {
        const penjualan = await Penjualan.findById(req.params.id);
        const details = await DetailProduk.find({ 
            id_penjualan: req.params.id 
        }).populate('id_produk');

        res.render('riwayatDetail', { penjualan, details });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

router.get('/download-pdf/:id', async (req, res) => {
    try {
        const penjualan = await Penjualan.findById(req.params.id)
            .populate({
                path: 'pelanggan_id',
                select: 'akun.nama akun.username'
            });
        const details = await DetailProduk.find({ 
            id_penjualan: req.params.id 
        }).populate('id_produk');

        // Create PDF document
        const doc = new PDFDocument({ 
            size: 'A4',
            margin: 40,
            bufferPages: true
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=riwayat-pembelian-${req.params.id}.pdf`);
        
        doc.pipe(res);

        // Add content to PDF
        doc.fontSize(20).text('KASIR KITA', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text('Riwayat Pembelian', { align: 'center' });
        doc.moveDown();
        
        // User info section
        doc.fontSize(12);
        doc.text(`Nama: ${penjualan.pelanggan_id?.akun.nama || '-'}`);
        doc.text(`Username: ${penjualan.pelanggan_id?.akun.username || '-'}`);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`);
        doc.moveDown();

        // Table header
        doc.fontSize(10);
        const tableTop = doc.y;
        doc.text('No', 50, tableTop);
        doc.text('Produk', 100, tableTop);
        doc.text('Jumlah', 250, tableTop);
        doc.text('Harga', 350, tableTop);
        doc.text('Total', 450, tableTop);

        // Draw horizontal line
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        // Add table content
        let y = tableTop + 30;
        let totalKeseluruhan = 0;

        details.forEach((detail, index) => {
            doc.text((index + 1).toString(), 50, y);
            doc.text(detail.id_produk.nama_produk, 100, y);
            doc.text(detail.jumlah.toString(), 250, y);
            doc.text(`Rp ${detail.id_produk.harga.toLocaleString('id-ID')}`, 350, y);
            doc.text(`Rp ${(detail.jumlah * detail.id_produk.harga).toLocaleString('id-ID')}`, 450, y);
            
            totalKeseluruhan += (detail.jumlah * detail.id_produk.harga);
            y += 20;
        });

        // Draw line before total
        doc.moveTo(50, y + 10)
           .lineTo(550, y + 10)
           .stroke();

        // Add total
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Total Keseluruhan:', 350, y + 20);
        doc.text(`Rp ${totalKeseluruhan.toLocaleString('id-ID')}`, 450, y + 20);

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
});

router.delete('/delete-all', checkSession, async (req, res) => {
    try {
        // Hapus semua riwayat pembelian
        await Penjualan.deleteMany({});
        // Hapus juga detail produk yang terkait
        await DetailProduk.deleteMany({});

        res.json({ success: true, message: 'Semua riwayat pembelian berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleting all history:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus semua riwayat pembelian.' });
    }
});

router.get('/detail-data/:id', async (req, res) => {
    try {
        const penjualan = await Penjualan.findById(req.params.id)
            .populate({
                path: 'pelanggan_id',
                select: 'akun.nama akun.username'
            });
            
        const details = await DetailProduk.find({ 
            id_penjualan: req.params.id 
        }).populate('id_produk');

        res.json({ penjualan, details });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Tambahkan route untuk download semua riwayat
router.get('/download-all', async (req, res) => {
    try {
        let penjualanList = await Penjualan.find()
            .populate({
                path: 'pelanggan_id',
                select: 'akun.nama akun.username'
            })
            .sort({ tanggalPenjualan: -1 });

        // Create PDF
        const doc = new PDFDocument({ 
            size: 'A4',
            margin: 40,
            bufferPages: true
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="semua-riwayat-pembelian.pdf"');
        doc.pipe(res);

        // Header
        doc.fontSize(24).text('KASIR KITA', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(16).text('Riwayat Pembelian', { align: 'center' });
        doc.moveDown(1);

        // Info cetak
        doc.fontSize(12);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`);
        doc.moveDown(1);

        // Draw table header
        const tableTop = doc.y;
        const colWidths = {
            no: 40,
            pelanggan: 120,
            tanggal: 150,
            total: 150
        };
        
        // Header background
        doc.rect(50, tableTop - 5, 500, 20).fill('#f0f0f0');
        
        // Header text
        doc.fillColor('black');
        doc.fontSize(10);
        let currentX = 50;
        
        doc.text('No', currentX, tableTop);
        currentX += colWidths.no;
        
        doc.text('Pelanggan', currentX, tableTop);
        currentX += colWidths.pelanggan;
        
        doc.text('Tanggal', currentX, tableTop);
        currentX += colWidths.tanggal;
        doc.text('Total', currentX, tableTop);

        // Draw horizontal line
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        // Content
        let yPos = tableTop + 25;
        let totalKeseluruhan = 0;

        penjualanList.forEach((penjualan, index) => {
            // Check if we need a new page
            if (yPos > doc.page.height - 100) {
                doc.addPage();
                yPos = 50;
            }

            currentX = 50;
            
            // No
            doc.text((index + 1).toString(), currentX, yPos);
            currentX += colWidths.no;
            
            // Pelanggan
            const pelangganNama = penjualan.pelanggan_id?.akun.nama || '-';
            doc.text(pelangganNama.substring(0, 15), currentX, yPos);
            currentX += colWidths.pelanggan;
            
            // Tanggal
            doc.text(new Date(penjualan.tanggalPenjualan).toLocaleString('id-ID'), currentX, yPos);
            currentX += colWidths.tanggal;
            
            // Total
            doc.text(`Rp ${penjualan.totalBiaya.toLocaleString('id-ID')}`, currentX, yPos);
            
            totalKeseluruhan += penjualan.totalBiaya;
            yPos += 20;

            // Draw light line between rows
            doc.moveTo(50, yPos - 5)
               .lineTo(550, yPos - 5)
               .strokeColor('#cccccc')
               .stroke();
        });

        // Total section
        yPos += 10;
        doc.moveTo(50, yPos)
           .lineTo(550, yPos)
           .strokeColor('#000000')
           .stroke();

        yPos += 10;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Total Keseluruhan:', 350, yPos);
        doc.text(`Rp ${totalKeseluruhan.toLocaleString('id-ID')}`, 450, yPos);

        // Footer
        doc.fontSize(10).font('Helvetica');
        doc.text('Terima kasih telah berbelanja di Kasir Kita', {
            align: 'center',
            bottom: doc.page.height - 50
        });

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Terjadi kesalahan saat membuat PDF');
    }
});

module.exports = router;