const express = require('express');
const cors = require('cors');
const app = express();
//'http://localhost:3000', 
const whitelist = ['https://restaurantlots.be','http://localhost:3000', 'http://restaurantlots.be', 'https://www.restaurantlots.be', 'http://www.restaurantlots.be'];
var corsOptionsDelegate = (req, callback) => {
    var corsOptions;
    if(whitelist.indexOf(req.header('Origin')) !== -1) {
        corsOptions = { origin: true };
    }
    else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
};

exports.cors = cors();
exports.corsWithOptions = cors(corsOptionsDelegate);