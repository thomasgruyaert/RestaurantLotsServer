const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');
const voucherRouter = express.Router();
const authenticate = require('../authenticate');
const {body, validationResult} = require('express-validator');
const {sendVoucherMail} = require('../nodemailer/nodemailer');
const fontkit = require('@pdf-lib/fontkit');
const randtoken = require('rand-token');
const { createMollieClient } = require('@mollie/api-client');

const mollieClient = createMollieClient(
    {apiKey: process.env.MOLLIE_TEST_KEY});

const fs = require('fs');
const {PDFDocument, rgb} = require('pdf-lib');
const path = require('path');

async function createMolliePayment(voucher) {
  const payment = await mollieClient.payments.create({
    amount: {
      value: parseFloat(voucher.voucherAmount).toFixed(2),
      currency: 'EUR'
    },
    description: 'Lots cadeaubon ter waarde van ' + voucher.voucherAmount
        + ' EUR',
    redirectUrl: `https://www.restaurantlots.be/vouchers/${voucher.id}/confirmation`,
    cancelUrl: `https://www.restaurantlots.be/vouchers/${voucher.id}/canceled`,
    // redirectUrl: `http://localhost:3000/vouchers/${voucher.id}/confirmation`,
    // cancelUrl: `http://localhost:3000/vouchers/${voucher.id}/canceled`,
    shippingAddress: { email: voucher.emailRecipient },
    locale: 'nl_BE',
    webhookUrl: `https://api.restaurantlots.be/vouchers/${voucher.id}/payment-update`
  });
  return payment;
}

async function processPayment(voucherId, paymentId, next, res) {
  const payment = await mollieClient.payments.get(paymentId);
  const voucher = await db.Voucher.findByPk(voucherId);
  if (voucher) {
    voucher.paymentStatus = payment.status;
    await voucher.save();
    if (payment.status === 'paid') {
      await generateVoucherPdfAndSendMail(paymentId, next, res);
    }
  }
}

async function generateVoucherPdfAndSendMail(voucher, paymentId, next, res) {
  const pdfBytes = await generateVoucherPdf(voucher);

  const outputPath = path.join(__dirname,
      `../output/${voucher.id}_voucher.pdf`);

  await fs.promises.writeFile(outputPath, pdfBytes);

  const response = await sendVoucherMail(voucher, outputPath);
  if (response === 'Success') {
    res.status(200).send("Success");
  } else {
    res.status(500).send({error: 'Error'});
  }
}

async function generateVoucherPdf(voucher) {
  const pdfPath = path.join(__dirname, '../pdf/voucher-lots-template.pdf');
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const form = pdfDoc.getForm();

  const frScriptfontPath = path.join(__dirname, '../fonts/FRSCRIPT.ttf');
  const frScriptFontBytes = fs.readFileSync(frScriptfontPath);
  const frScriptFont = await pdfDoc.embedFont(frScriptFontBytes);
  const helveticaFontPath = path.join(__dirname,
      '../fonts/BarlowCondensed-SemiBold.otf');
  const helveticaFontBytes = fs.readFileSync(helveticaFontPath);
  const helveticaFont = await pdfDoc.embedFont(helveticaFontBytes);
  const page = pdfDoc.getPages()[0];
  const {width, height} = page.getSize();

  var options = {
    year: "numeric",
    month: "2-digit",
    day: "numeric",
  };
  var validUntilDateString = voucher.validUntil.toLocaleDateString('nl-BE',
      options);

  const identifierText = `ID: #${voucher.id}`;
  const textWidthHelvetica = helveticaFont.widthOfTextAtSize(identifierText,
      16);
  const textWidthHelveticaValidUntil = helveticaFont.widthOfTextAtSize(
      validUntilDateString, 20);
  const textWidthHelveticaVoucherAmount = helveticaFont.widthOfTextAtSize(
      `${voucher.voucherAmount}`, 20);
  const textWidthFrScript = frScriptFont.widthOfTextAtSize(
      voucher.customMessage, 30);
  const textWidthSmakelijk = frScriptFont.widthOfTextAtSize('Smakelijk!', 40);

  page.drawText(`Aan: ${voucher.nameReceivers}`,
      {x: 60, y: 210, font: helveticaFont, size: 20});
  page.drawText(`Geschonken door: ${voucher.nameGifters}`,
      {x: 60, y: 180, font: helveticaFont, size: 20});
  page.drawText(`Bedrag: € ${voucher.voucherAmount}`, {
    x: width - textWidthHelveticaVoucherAmount - 160,
    y: 210,
    font: helveticaFont,
    size: 20
  });
  page.drawText(`Geldig tot en met: ${validUntilDateString}`, {
    x: width - textWidthHelveticaValidUntil - 180,
    y: 180,
    font: helveticaFont,
    size: 20
  });
  page.drawText(voucher.customMessage, {
    x: (page.getWidth() / 2) - (textWidthFrScript / 2),
    y: 100, font: frScriptFont, size: 30
  });
  page.drawText('Smakelijk!', {
    x: (page.getWidth() / 2) - (textWidthSmakelijk / 2),
    y: 60, font: frScriptFont, size: 40
  })

  //Aan
  page.drawLine({
    start: {x: 60, y: 205},
    end: {x: 90, y: 205},
    thickness: 2,
    color: rgb(0, 0, 0),
    opacity: 1
  });
  //Geschonken door
  page.drawLine({
    start: {x: 60, y: 175},
    end: {x: 185, y: 175},
    thickness: 2,
    color: rgb(0, 0, 0),
    opacity: 1
  });
  //Bedrag
  page.drawLine({
    start: {x: width - textWidthHelveticaVoucherAmount - 160, y: 205},
    end: {x: width - textWidthHelveticaVoucherAmount - 160 + 55, y: 205},
    thickness: 2,
    color: rgb(0, 0, 0),
    opacity: 1
  });
  //Geldig tot en met
  page.drawLine({
    start: {x: width - textWidthHelveticaValidUntil - 180, y: 175},
    end: {x: width - textWidthHelveticaValidUntil - 180 + 125, y: 175},
    thickness: 2,
    color: rgb(0, 0, 0),
    opacity: 1
  });

  page.drawText(identifierText, {
    x: width - textWidthHelvetica - 60,
    y: height - 70,
    font: helveticaFont,
    size: 16,
    color: rgb(0, 0, 0),
  });

  form.flatten();

  return await pdfDoc.save();
}

voucherRouter.use(bodyParser.json());
const minVoucherAmount = 5;
const maxVoucherAmount = 1000;

voucherRouter.route('/:voucherId/send-mail')
.options(cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
})
.get(cors.cors, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('GET operation not supported on /vouchers/send-mail');
})
.post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  const voucherId = parseInt(req.params.voucherId, 10);

  db.Voucher.findByPk(voucherId)
  .then((voucher) => {
    generateVoucherPdf(voucher).then((pdfBytes) => {
      const outputPath = path.join(__dirname,
          `../output/${voucher.id}_voucher.pdf`);

      fs.writeFileSync(outputPath, pdfBytes);
      sendVoucherMail(voucher, outputPath).then((response) => {
        if (response === 'Success') {
          res.status(200).send("Success");
        } else {
          res.status(500).send({error: 'Error'});
        }
      }, (err) => next(err))
    }, (err) => next(err));
  }, (err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('PUT operation not supported on /vouchers/send-mail');
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('DELETE operation not supported on /vouchers/send-mail');
});

voucherRouter.route('/:voucherId/generate')
.options(cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
})
.get(cors.cors, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('GET operation not supported on /vouchers/generate');
})
.post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  const voucherId = parseInt(req.params.voucherId, 10);

  db.Voucher.findByPk(voucherId)
  .then((voucher) => {
    generateVoucherPdf(voucher).then((pdfBytes) => {
      const outputPath = path.join(__dirname,
          `../output/${voucher.id}_voucher.pdf`);

      fs.writeFileSync(outputPath, pdfBytes);

      res.status(200).download(outputPath, `${voucher.id}_voucher.pdf`,
          (err) => {
            if (err) {
              next(err);
            } else {
              // Optioneel: bestand opruimen na download
              fs.unlink(outputPath, () => {
              });
            }
          });
    }, (err) => next(err));
  }, (err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('PUT operation not supported on /vouchers/generate');
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('DELETE operation not supported on /vouchers/generate');
});

voucherRouter.route('/')
.options(cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
})
.get(cors.cors, authenticate.verifyToken, (req, res, next) => {
  db.Voucher.findAll(req.query)
  .then((vouchers) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.json(vouchers);
  }, (err) => next(err))
  .catch((err) => next(err));
})
.post(cors.corsWithOptions,
    authenticate.verifyToken,
    body('nameGifters').isLength({min: 2}).withMessage(
        "Gelieve een geldige achternaam op te geven"),
    body('nameReceivers').isLength({min: 2}).withMessage(
        "Gelieve een geldige voornaam op te geven"),
    body('customMessage').optional().isLength({max: 60}).withMessage(
        "Gelieve een boodschap op te geven van maximum 60 tekens"),
    body('voucherAmount').isFloat(
        {min: minVoucherAmount, max: maxVoucherAmount}).withMessage(
        `Gelieve een geldig bedrag op te geven tussen ${minVoucherAmount} EUR en ${maxVoucherAmount} EUR`
    ),
    body('emailRecipient').isEmail().withMessage(
        "Gelieve een geldig emailadres op te geven."), (req, res, next) => {
      req.body.boughtDate = Date.now();
      db.Voucher.create(req.body)
      .then((voucher) => {
        createMolliePayment(voucher).then((payment) => {
          return res.status(200).json({ checkoutUrl: payment.getCheckoutUrl() });
        })
      }, (err) => next(err))
      .catch((err) => next(err));
    })
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('PUT operation not supported on /vouchers');
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('DELETE operation not supported on /vouchers');
});

voucherRouter.route('/:voucherId/payment-update')
.options(cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
})
.get(cors.cors, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end(
      `GET operation not supported on /vouchers/${req.params.voucherId}/payment-update`);
})
.post(cors.cors, (req, res, next) => {
  const paymentId = req.body.id;
  const voucherId = parseInt(req.params.voucherId, 10);
  processPayment(voucherId, paymentId, next, res).then(
      () => res.sendStatus(200),
      (err) => next(err)).catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end(
      `PUT operation not supported on /vouchers/${req.params.voucherId}/payment-update`);
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end(
      `DELETE operation not supported on /vouchers/${req.params.voucherId}/payment-update`);
});

voucherRouter.route('/:voucherId')
.options(cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
})
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
  db.Voucher.update(req.body, {where: {id: voucherId}})
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
    where: {id: voucherId}
  })
  .then((resp) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.json(resp);
  }, (err) => next(err))
  .catch((err) => next(err));
});

module.exports = voucherRouter;
