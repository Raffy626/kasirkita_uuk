const Penjualan = require('../models/penjualanModel');
const DetailProduk = require('../models/detailProduk');

const historyController = {
    getHistoryPenjualan: async (req, res) => {
        try {
            const penjualanList = await Penjualan.find({ 
                pelanggan_id: req.session.user._id 
            }).sort({ tanggalPenjualan: -1 });

            res.render('historyPenjualan', {
                penjualanList: penjualanList
            });
        } catch (error) {
            console.error('Error getting history:', error);
            res.status(500).send('Error getting history');
        }
    },

    getHistoryDetail: async (req, res) => {
        try {
            const penjualan = await Penjualan.findById(req.params.id);
            if (!penjualan) {
                return res.status(404).send('Transaction not found');
            }

            const details = await DetailProduk.find({ 
                id_penjualan: req.params.id 
            }).populate('id_produk');

            res.render('historyDetail', {
                penjualan: penjualan,
                details: details
            });
        } catch (error) {
            console.error('Error getting history detail:', error);
            res.status(500).send('Error getting history detail');
        }
    }
};

module.exports = historyController;