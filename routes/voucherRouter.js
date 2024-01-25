const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');
const voucherRouter = express.Router();
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator');
const { sendVoucherMail } = require('../nodemailer/nodemailer');
const randtoken = require('rand-token');


voucherRouter.use(bodyParser.json());
const minVoucherAmount = 20;
const maxVoucherAmount = 200;

const stripe = require('stripe')(process.env.STRIPE_KEY);
const BASE_URL = process.env.CLIENT_URL+"/vouchers";

// voucherRouter.route('/create-payment-intent')   
// .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
// .post(cors.corsWithOptions,
//   body('nameGifters').isLength({ min: 2 }).withMessage("Gelieve een geldige achternaam op te geven"),
//   body('nameReceivers').isLength({ min: 2 }).withMessage("Gelieve een geldige voornaam op te geven"),
//   body('voucherAmount').isInt({min: minVoucherAmount, max: maxVoucherAmount}),
//   body('emailRecipient').isEmail().withMessage("Gelieve een geldig emailadres op te geven."),
//     async (req, res) => {
//     console.log(req.body);
//     const paymentIntent = await stripe.paymentIntents.create({
//         amount: req.body.voucherAmount * 100,
//         currency: "eur",
//         automatic_payment_methods: {
//           enabled: true,
//         },
//         metadata: {
//           nameGifters: req.body.nameGifters,
//           nameReceivers: req.body.nameReceivers,
//           emailRecipient: req.body.emailRecipient,
//           voucherAmount: req.body.voucherAmount
//         },
//       });
    
//       res.send({
//         clientSecret: paymentIntent.client_secret
//       });
// });


voucherRouter.route('/create-checkout-session')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .post(cors.corsWithOptions, 
    body('nameGifters').isLength({ min: 2 }).withMessage("Gelieve een geldige achternaam op te geven"),
    body('nameReceivers').isLength({ min: 2 }).withMessage("Gelieve een geldige voornaam op te geven"),
    body('voucherAmount').isInt({min: minVoucherAmount, max: maxVoucherAmount}),
    body('emailRecipient').isEmail().withMessage("Gelieve een geldig emailadres op te geven."), async (req, res) => {
    console.log(req.body);
  const session = await stripe.checkout.sessions.create({
    customer_email: req.body.emailRecipient,
    line_items: [
      {
        price_data: {
            currency: 'eur',
            product_data: {
                name: 'Geschenkbon Lots',
                description: 'Geschenkbon te gebruiken bij Lots',
                images: ['https://firebasestorage.googleapis.com/v0/b/lots-images.appspot.com/o/images%2FCadeaubon-lots-vb.jpg?alt=media']
            },
            unit_amount: req.body.voucherAmount * 100,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
    metadata: {
        nameGifters: req.body.nameGifters,
        nameReceivers: req.body.nameReceivers,
        emailRecipient: req.body.emailRecipient,
        voucherAmount: req.body.voucherAmount,
        customMessage: req.body.customMessage ? req.body.customMessage : ''
    }},
    locale: 'nl',
    mode: 'payment',
    success_url: `${BASE_URL}/confirmation`,
    cancel_url: `${BASE_URL}`,
  });
    sessionDataStore.set(session.id, req.body);
    res.json({url: session.url});
});

const endpointSecret = process.env.ENDPOINT_SECRET;

voucherRouter.route('/stripe_webhook')
.post(cors.corsWithOptions, (req, res, next) => {
    let event;
      const signature = req.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(
            req.body,
          signature,
          endpointSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return res.sendStatus(400);
      }
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('PaymentIntent was successful!');
        const voucherData = paymentIntent.metadata;
        voucherData.boughtDate = new Date().toISOString();
        db.Voucher.create(voucherData)
        .then((voucher) => {
            sendVoucherMail(voucher)
                .then((response) => {
                    if (response !== 'Success') {
                        res.status(500).send({ error: 'Error' });
                    }
                }, (err) => next(err));
            console.log('Voucher Purchased ', voucher);
        }, (err) => next(err))
        .catch((err) => {
            console.error(err);
            res.status(500).send({ error: 'Error' });
        });
        break;
      case 'payment_intent.failed':
        console.log('PaymentIntent failed!');
        res.json({received: true});
      default:
        console.log(`Unhandled event type ${event.type}`);
        res.json({received: true});
    }
  });


voucherRouter.route('/')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyToken, (req, res, next) => {
      console.log("let's go vouchers");
        db.Voucher.findAll(req.query)
            .then((vouchers) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(vouchers);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
      res.statusCode = 403;
      res.end('POST operation not supported on /vouchers');
        })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /vouchers');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
      res.statusCode = 403;
      res.end('DELETE operation not supported on /vouchers');
    });

voucherRouter.route('/:voucherId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyToken, (req, res, next) => {
        const voucherId = parseInt(req.params.voucherId, 10);
        db.Voucher.findByPk(voucherId)
            .then((voucher) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(voucher);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('POST operation not supported on /vouchers/' + req.params.voucherId);
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        const voucherId = parseInt(req.params.voucherId, 10);
        db.Voucher.update(req.body, { where: { id: voucherId } })
            .then((voucher) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(voucher);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        const voucherId = parseInt(req.params.voucherId, 10);
        db.Voucher.destroy({
            where: { id: voucherId }
        })
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });

module.exports = voucherRouter;