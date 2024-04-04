const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');
const voucherRouter = express.Router();
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator');
const randtoken = require('rand-token');

voucherRouter.use(bodyParser.json());

function generateVoucherCode() {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();
    const voucherCode = `VCR-${hashCode(emailGifter)}-${hashCode(timestamp.toString())}-${hashCode(randomPart)}`.replace("--", "-");
    return voucherCode;
}

voucherRouter.route('/')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyToken, (req, res, next) => {
        db.GiftVoucher.findAll(req.query)
            .then((voucherInfo) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(voucherInfo);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions,
        body('nameGifter').isLength({ min: 2 }).withMessage("Gelieve een geldige achternaam op te geven"),
        body('nameReceiver').isLength({ min: 2 }).withMessage("Gelieve een geldige voornaam op te geven"),
        body('voucherValue').isNumeric().withMessage("Gelieve een geldig voucherbedrag op te geven"),
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            var requestBody = req.body;
            requestBody["voucherCode"] = generateVoucherCode();
            
            db.GiftVoucher.create(requestBody)
                .then((voucherInfo) => {
                    console.log('Voucher Created ', voucherInfo);
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(voucherInfo);
                }, (err) => next(err))
                .catch((err) => next(err));
        })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /vouchers');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        db.GiftVoucher.destroy({})
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });