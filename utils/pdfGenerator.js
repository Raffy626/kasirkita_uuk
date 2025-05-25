const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateReceipt = async (req, res) => {
    try {
        const cart = req.session.cart || [];
        const totalBiaya = cart.reduce((total, item) => total + (item.harga * item.quantity), 0);
        
        // Create PDF document
        const doc = new PDFDocument();
        const filename = `receipt-${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../public/receipts', filename);
        
        doc.pipe(fs.createWriteStream(filePath));
        
        // Add content to PDF
        doc.fontSize(20).text('Struk Pembayaran', {align: 'center'});
        doc.moveDown();
        doc.fontSize(12).text(`Tanggal: ${new Date().toLocaleString()}`);
        doc.moveDown();
        
        // Add table header
        doc.text('Nama Produk\t\tHarga\t\tJumlah\t\tTotal');
        doc.moveDown();
        
        // Add items
        cart.forEach(item => {
            doc.text(`${item.nama_produk}\t\tRp ${item.harga}\t\t${item.quantity}\t\tRp ${item.harga * item.quantity}`);
        });
        
        doc.moveDown();
        doc.fontSize(14).text(`Total Pembayaran: Rp ${totalBiaya}`, {align: 'right'});
        
        // Finalize PDF
        doc.end();
        
        // Clear cart after checkout
        req.session.cart = [];
        
        // Send PDF file
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error generating receipt');
            }
            // Delete file after download
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
        });
        
    } catch (error) {
        console.error('Error generating receipt:', error);
        res.status(500).send('Error generating receipt');
    }
};

module.exports = {
    generateReceipt
};