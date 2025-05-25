const express = require("express")
const app = express();
const connectDB = require("./config/db")
const path = require('path');
const session = require('express-session');

require('dotenv').config();
const port = process.env.PORT;

const authRoutes = require('./routes/authRoutes');
const produkRoutes = require('./routes/produkRoutes');
const penjualanRoutes = require('./routes/penjualanRoutes');
const checkoutRouter = require('./routes/checkout');
const historyRoutes = require('./routes/riwayatRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            maxAge: 24 * 60 * 60 * 1000 // 24 jam
        }
    })
);

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
})

app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

app.use("/auth", authRoutes);
app.use("/produk", produkRoutes);
app.use("/penjualan", penjualanRoutes);
app.use('/checkout', checkoutRouter);
app.use('/history', historyRoutes);
app.use('/download', downloadRoutes);

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});