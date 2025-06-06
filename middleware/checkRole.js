const checkRole = (roles) => (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (allowedRoles.includes(req.session.user.role)) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

module.exports = checkRole;