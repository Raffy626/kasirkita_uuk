const express = require('express');
const router = express.Router();
const penjualanController = require('../controllers/penjualanController');
const checkSession = require('../middleware/checkSession');
const checkRole = require('../middleware/checkRole');

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
};

router.use(isAuthenticated);

router.get('/', checkRole('pelanggan'), checkSession, penjualanController.getDaftarPenjualan);
router.get('/add-to-cart/:id', checkSession, checkRole('pelanggan'), penjualanController.addToCart);
router.get('/cancel-item/:id', checkSession, checkRole('pelanggan'), penjualanController.cancelItem);

module.exports = router;