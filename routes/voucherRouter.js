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
const crypto = require('crypto');
const {createMollieClient} = require('@mollie/api-client');
const isLocal = false;
const voucherAuthenticationRequired = true;
const testingMode = true;


const key = testingMode ? process.env.MOLLIE_TEST_KEY
    : process.env.MOLLIE_LIVE_KEY;

const mollieClient = createMollieClient(
    {apiKey: key});

const fs = require('fs');
const {PDFDocument, rgb} = require('pdf-lib');
const path = require('path');

const projectRoot = process.cwd();

async function createMolliePayment(voucher) {
  const baseUrl = isLocal ? 'http://localhost:3000'
      : 'https://www.restaurantlots.be';

  return await mollieClient.payments.create({
    amount: {
      value: parseFloat(voucher.voucherAmount).toFixed(2),
      currency: 'EUR'
    },
    description: 'Lots cadeaubon ter waarde van ' + voucher.voucherAmount
        + ' EUR',
    redirectUrl: `${baseUrl}/vouchers/${voucher.id}/confirmation?token=${voucher.confirmationToken}`,
    cancelUrl: `${baseUrl}/vouchers/${voucher.id}/canceled`,
    shippingAddress: {email: voucher.emailRecipient},
    locale: 'nl_BE',
    webhookUrl: `https://api.restaurantlots.be/api/vouchers/${voucher.id}/payment-update`,
  });
}

async function processPayment(voucherId, paymentId) {
  process.stdout.write("Payment ID: " + paymentId + "\n");
  const payment = await mollieClient.payments.get(paymentId);
  const voucher = await db.Voucher.findByPk(voucherId);
  if (!voucher) {
    return 'Error';
  }

  if (voucher.paymentStatus === 'paid') {
    console.log(`Voucher ${voucherId} already processed`);
    return 'Success'; // Treat as success so Mollie stops retrying
  }

  process.stdout.write("Found voucher, updating status...");
  voucher.paymentStatus = payment.status;
  await voucher.save();

  if (payment.status === 'paid' && !voucher.emailSent) {
    const response = await generateVoucherPdfAndSendMail(voucher);
    if(response === 'Success'){
      voucher.emailSent = true;
      await voucher.save();
    }
    return response;
  }

  return 'Error';
}

async function generateVoucherPdfAndSendMail(voucher) {
  const pdfBytes = await generateVoucherPdf(voucher);

  const outputDir = path.resolve(projectRoot || process.cwd(), 'output');

  await fs.promises.mkdir(outputDir, {recursive: true});

  const outputPath = path.join(outputDir, `${voucher.id}_voucher.pdf`);

  await fs.promises.writeFile(outputPath, pdfBytes);

  const response = await sendVoucherMail(voucher, outputPath);
  return response;
}

async function generateVoucherPdf(voucher) {
  const pdfPath = path.resolve(projectRoot, 'pdf', 'voucher-lots-template.pdf');
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const form = pdfDoc.getForm();

  const frScriptFontPath = path.resolve(projectRoot, 'fonts/FrScript.ttf');
  const frScriptFontBytes = fs.readFileSync(frScriptFontPath);
  const frScriptFont = await pdfDoc.embedFont(frScriptFontBytes);
  const helveticaFontPath = path.resolve(projectRoot,
      'fonts/BarlowCondensed-SemiBold.otf');
  const helveticaFontBytes = fs.readFileSync(helveticaFontPath);
  const helveticaFont = await pdfDoc.embedFont(helveticaFontBytes);
  const page = pdfDoc.getPages()[0];
  const {width, height} = page.getSize();

  var options = {
    year: "numeric",
    month: "2-digit",
    day: "numeric",
  };
  var validUntilDateString = voucher.validUntilDate.toLocaleDateString('nl-BE',
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

voucherRouter.route('/:voucherId/status')
.options(cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
})
.get(cors.cors, async (req, res, next) => {
  try {
    const voucherId = parseInt(req.params.voucherId, 10);
    const token = req.query.token;

    if (isNaN(voucherId) || !token) {
      return res.status(400).json({error: 'Invalid request'});
    }

    const voucher = await db.Voucher.findByPk(voucherId);
    if (!voucher) {
      return res.status(404).json({error: 'Voucher not found'});
    }

    if (voucher.confirmationToken !== token) {
      return res.status(403).json({error: 'Invalid token'});
    }

    const payment = await mollieClient.payments.get(voucher.paymentId);

    return res.json({
      paymentValid: payment.status === 'paid',
      paymentStatus: payment.status,
    });
  } catch (err) {
    next(err);
  }
});

voucherRouter.route('/:voucherId/send-mail')
.options(cors.corsWithOptions, (req, res) => {
  res.sendStatus(200);
})
.get(cors.cors, authenticate.verifyToken, (req, res, next) => {
  res.statusCode = 403;
  res.end('GET operation not supported on /vouchers/send-mail');
})
.post(cors.corsWithOptions, authenticate.verifyToken,
    async (req, res, next) => {
      try {
        const voucherId = parseInt(req.params.voucherId, 10);
        const voucher = await db.Voucher.findByPk(voucherId);
        if (!voucher) {
          return res.status(404).send({error: 'Voucher not found'});
        }
        const response = await generateVoucherPdfAndSendMail(voucher);
        if (response === 'Success') {
          return res.status(200).send("Success");
        } else {
          return res.status(500).send({error: 'Error'});
        }
      } catch (err) {
        next(err);
      }
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
      const outputDir = path.resolve(projectRoot, 'output');

      fs.promises.mkdir(outputDir, {recursive: true}).then(() => {
        const outputPath = path.join(outputDir, `${voucher.id}_voucher.pdf`);

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
    voucherAuthenticationRequired ? authenticate.verifyToken : (req, res,
        next) => next(),
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
      const now = new Date();
      now.setFullYear(now.getFullYear() + 1);
      req.body.validUntilDate = now;
      req.body.confirmationToken = crypto.randomBytes(32).toString('hex');
      db.Voucher.create(req.body)
      .then((voucher) => {
        createMolliePayment(voucher).then(async (payment) => {
          process.stdout.write(
              "Created Mollie payment with ID: " + payment.id + "\n");
          voucher.paymentId = payment.id;
          voucher.paymentStatus = payment.status;
          await voucher.save();
          return res.status(200).json({checkoutUrl: payment.getCheckoutUrl()});
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
.post((req, res, next) => {
  process.stdout.write("RECEIVED PAYMENT UPDATE" + "\n");
  process.stdout.write(JSON.stringify(req.body) + "\n");
  const paymentId = req.body.id;
  if (!paymentId) {
    return res.status(400).send('Missing payment ID');
  }
  const voucherId = parseInt(req.params.voucherId, 10);
  process.stdout.write("VoucherId: " + voucherId + "\n");
  process.stdout.write("Processing payment..." + "\n");
  processPayment(voucherId, paymentId).then(
      (response) => {
        if (response === 'Success') {
          return res.status(200).send("Success");
        } else {
          return res.status(500).send({error: 'Error'});
        }
      },
      (err) => next(err)).catch((err) => next(err));
})

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
