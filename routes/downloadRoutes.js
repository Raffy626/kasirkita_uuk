const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Penjualan = require('../models/penjualanModel');
const User = require('../models/userModel');
const checkSession = require('../middleware/checkSession');

router.get('/checkout/download-receipt/:transactionId', async (req, res) => {
    try {
        const transactionId = req.params.transactionId;
        
        // Tentukan lokasi file struk berdasarkan transactionId
        const receiptFilePath = path.join(__dirname, '../public/receipts', `receipt-${transactionId}.pdf`);

        // Periksa apakah file struk ada
        fs.access(receiptFilePath, fs.constants.F_OK, (err) => {
            if (err) {
                // Jika file tidak ada, kirim error 404
                return res.status(404).send('Struk tidak ditemukan');
            }

            // Kirim file PDF struk ke pengguna
            res.download(receiptFilePath, `receipt-${transactionId}.pdf`, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error downloading receipt:', downloadErr);
                    return res.status(500).send('Terjadi kesalahan saat mengunduh struk');
                }

                // Setelah berhasil mengunduh, hapus file struk
                fs.unlink(receiptFilePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting receipt file:', unlinkErr);
                });
            });
        });
    } catch (error) {
        console.error('Error generating download for receipt:', error);
        res.status(500).send('Terjadi kesalahan saat memproses permintaan');
    }
});

// Route untuk mendownload semua riwayat pembelian
router.get('/all', checkSession, async (req, res) => {
    try {
        let penjualanList;
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        
        if (req.session.user.role === 'admin') {
            penjualanList = await Penjualan.find()
                .populate('pelanggan_id', 'akun.nama akun.username')
                .sort({ tanggalPenjualan: -1 });
        } else {
            penjualanList = await Penjualan.find({ pelanggan_id: userId })
                .populate('pelanggan_id', 'akun.nama akun.username')
                .sort({ tanggalPenjualan: -1 });
        }

        if (!penjualanList || penjualanList.length === 0) {
            return res.status(400).send('Tidak ada riwayat pembelian untuk dicetak.');
        }

        // Create PDF with specific page size and margins
        const doc = new PDFDocument({ 
            size: 'A4',
            margin: 40,
            bufferPages: true // Enable buffer pages for better page management
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="riwayat-pembelian.pdf"');
        doc.pipe(res);

        // Define reusable dimensions
        const pageWidth = doc.page.width - 80; // Account for margins
        const maxY = doc.page.height - 100; // Maximum Y position before new page

        // Header
        doc.fontSize(20).text('KASIR KITA', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).text('Riwayat Pembelian', { align: 'center' });
        doc.moveDown(0.5);

        // User info
        doc.fontSize(10);
        doc.text(`Nama: ${user.akun.nama || 'undefined'}`);
        doc.text(`Username: ${user.akun.username || 'admin'}`);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`);
        doc.moveDown(0.5);

        // Table settings
        const colWidths = {
            no: 30,
            pelanggan: req.session.user.role === 'admin' ? 100 : 0,
            tanggal: 120,
            total: 100
        };

        // Table header
        const startX = 40;
        let currentX = startX;
        let currentY = doc.y;

        // Draw header background
        doc.rect(startX, currentY - 5, pageWidth, 20).fillAndStroke('#f0f0f0', '#cccccc');
        
        // Header text
        doc.fillColor('black');
        doc.text('No', currentX, currentY);
        currentX += colWidths.no;
        
        if (req.session.user.role === 'admin') {
            doc.text('Pelanggan', currentX, currentY);
            currentX += colWidths.pelanggan;
        }
        
        doc.text('Tanggal', currentX, currentY);
        currentX += colWidths.tanggal;
        doc.text('Total', currentX, currentY);
        
        currentY += 20;

        // Content
        let totalKeseluruhan = 0;
        
        penjualanList.forEach((penjualan, index) => {
            // Check if we need a new page
            if (currentY > maxY) {
                doc.addPage();
                currentY = 50; // Reset Y position on new page
            }

            currentX = startX;
            
            // No
            doc.text((index + 1).toString(), currentX, currentY);
            currentX += colWidths.no;
            
            // Pelanggan (if admin)
            if (req.session.user.role === 'admin') {
                const pelangganNama = penjualan.pelanggan_id?.akun.nama || '-';
                doc.text(pelangganNama.substring(0, 15), currentX, currentY); // Limit text length
                currentX += colWidths.pelanggan;
            }
            
            // Tanggal
            doc.text(new Date(penjualan.tanggalPenjualan).toLocaleString('id-ID'), currentX, currentY);
            currentX += colWidths.tanggal;
            
            // Total
            doc.text(`Rp ${penjualan.totalBiaya.toLocaleString('id-ID')}`, currentX, currentY);
            
            totalKeseluruhan += penjualan.totalBiaya;
            currentY += 20;

            // Draw light line between rows
            doc.moveTo(startX, currentY - 5)
               .lineTo(startX + pageWidth, currentY - 5)
               .strokeColor('#cccccc')
               .stroke();
        });

        // Total section
        currentY += 10;
        doc.moveTo(startX, currentY)
           .lineTo(startX + pageWidth, currentY)
           .strokeColor('#000000')
           .stroke();

        currentY += 10;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Total Keseluruhan:', startX + pageWidth - 200, currentY);
        doc.text(`Rp ${totalKeseluruhan.toLocaleString('id-ID')}`, startX + pageWidth - 100, currentY);

        // Footer
        doc.fontSize(8).font('Helvetica');
        doc.text('Terima kasih telah berbelanja di Kasir Kita', {
            align: 'center',
            bottom: doc.page.height - 50
        });

        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Terjadi kesalahan saat membuat PDF');
    }
});

module.exports = router;