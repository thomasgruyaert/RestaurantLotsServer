var jwt = require("jsonwebtoken");
const config = require("./config/auth.config");

exports.verifyToken = (req, res, next) => {
    let bearerHeader = req.headers["authorization"];
    if (!bearerHeader) {
        return res.status(403).send({
            message: "No token provided!"
        });
    } else {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];

        jwt.verify(bearerToken, config.secret, (err, decoded) => {
            if (err) {
                return res.status(401).send({
                    message: "Unauthorized!"
                });
            }
            req.adminId = decoded.id;
            next();
        });
    }
};