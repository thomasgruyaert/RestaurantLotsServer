require('dotenv').config();
const hbs = require('nodemailer-express-handlebars');
const nodemailer = require('nodemailer');
const {MailtrapClient} = require("mailtrap");
const path = require('path');
const {renderTemplate} = require("./mailtrap-hbs-renderer");

// let transporter = nodemailer.createTransport({
//     host: process.env.MAIL_HOST,
//     secure: true,
//     port: process.env.MAIL_HOST,
//     auth: {
//         user: process.env.SENDER_EMAIL,
//         pass: process.env.SENDER_PASS
//     }
// });

// const transporter = nodemailer.createTransport(
//     MailtrapTransport({
//       token: process.env.MAILTRAP_TOKEN,
//       debug: true, // show debug output
//       logger: true // log information in console
//     },
//         ),
//
// );

const client = new MailtrapClient({
  token: process.env.MAILTRAP_TOKEN,
});

const handlebarOptions = {
  viewEngine: {
    partialsDir: path.resolve('./nodemailer/templates/'),
    defaultLayout: false
  },
  viewPath: path.resolve('./nodemailer/templates/'),
};

async function sendResApprovalMailClient(requestorEmail, reservation) {
  var reservationDateTime = new Date(reservation.reservedDateTime);
  var options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  var reservationDateString = reservationDateTime.toLocaleTimeString('nl-BE',
      options);
  let context = {
    srcLotsBanner: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/gallery (22).jpeg')}?alt=media`,
    srcLotsLogo: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/Transparent-1.png')}?alt=media`,
    srcLotsLocatie: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/Group-4.png')}?alt=media`,
    srcResApproved: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/approved.png')}?alt=media`,
    reservationFullName: reservation.firstName + " " + reservation.lastName,
    reservationId: reservation.id,
    reservationNPeople: reservation.nPeople,
    reservationMobileNr: reservation.mobileNr,
    reservationEmail: reservation.email,
    reservationDateString: reservationDateString,
    reservationMealType: reservation.mealType === 'dinner' ? 'Diner'
        : 'Lunch',
    reservationPayWithVoucher: reservation.payWithVoucher ? 'ja' : 'neen',
    reservationAdditionalComments: reservation.additionalComments
        ? reservation.additionalComments : '/',
  }

const html = await renderTemplate("reservationConfirmationClient", context);

return await client.send({
  from: {name: "Restaurant Lots", email: process.env.SENDER_EMAIL},
  to: [{email: requestorEmail}],
  subject: `Restaurant Lots - Bevestiging Reservatie #${reservation.id}`,
  html,
  text: `Je reservatie #${reservation.id} is bevestigd op ${reservationDateString}.`,
});
}

async function sendResRefusalMailClient(requestorEmail, refusalReason) {
  let context = {
    srcLotsBanner: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/gallery (22).jpeg')}?alt=media`,
    srcLotsLogo: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/Transparent-1.png')}?alt=media`,
    srcLotsLocatie: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/Group-4.png')}?alt=media`,
    srcResDenied: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/denied.png')}?alt=media`,
    refusalReason: refusalReason
  }
  const html = await renderTemplate("reservationRefusalClient", context);
  return await client.send({
    from: {name: "Restaurant Lots", email: process.env.SENDER_EMAIL},
    to: [{email: requestorEmail}],
    subject: `Restaurant Lots - Reservatie geweigerd`,
    html,
    text: `Jouw reservatie werd geweigerd. Reden: ${refusalReason}`
  });
}

async function sendResPendingMailClient(requestorEmail) {
  let context = {
    srcLotsBanner: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/gallery (22).jpeg')}?alt=media`,
    srcLotsLogo: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/Transparent-1.png')}?alt=media`,
    srcLotsLocatie: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/Group-4.png')}?alt=media`,
    srcResPending: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/pending.png')}?alt=media`,
  }
  const html = await renderTemplate("reservationPendingClient", context);
  return await client.send({
    from: {name: "Restaurant Lots", email: process.env.SENDER_EMAIL},
    to: [{email: requestorEmail}],
    subject: `Restaurant Lots - Reservatie verstuurd`,
    html,
    text: "Jouw reservatie werd verstuurd, maar moet nog goedgekeurd worden."
  });
}

async function sendResPendingMailLots(reservation) {
  var reservationDateTime = new Date(reservation.reservedDateTime);
  var options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  var reservationDateString = reservationDateTime.toLocaleTimeString('nl-BE',
      options);
  let context = {
    srcResPending: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/pending.png')}?alt=media`,
    srcLotsBanner: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/gallery (22).jpeg')}?alt=media`,
    srcLotsLogo: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/Transparent-1.png')}?alt=media`,
    srcLotsLocatie: `${process.env.FIREBASE_URL}${encodeURIComponent(
        'mail/reservation/Group-4.png')}?alt=media`,
    reservationFullName: reservation.firstName + " " + reservation.lastName,
    reservationConfirmationCode: reservation.confirmationCode,
    reservationId: reservation.id,
    reservationNPeople: reservation.nPeople,
    reservationMobileNr: reservation.mobileNr,
    reservationEmail: reservation.email,
    reservationDateString: reservationDateString,
    reservationMealType: reservation.mealType === 'dinner' ? 'Diner'
        : 'Lunch',
    reservationPayWithVoucher: reservation.payWithVoucher ? 'ja' : 'neen',
    reservationAdditionalComments: reservation.additionalComments
        ? reservation.additionalComments : '/',
  }
  const html = await renderTemplate("reservationPendingLots", context);
  return await client.send({
    from: {name: "Restaurant Lots", email: process.env.NO_REPLY_EMAIL},
    to: [{email: process.env.SENDER_EMAIL}],
    subject: `Online Reservatie - Aanvraag Reservatie #${reservation.id}`,
    html,
    text: `Reservatie met ID #${reservation.id} werd aangevraagd`
  });
}

async function sendVoucherMail(voucher, pdfPath) {
  var boughtDate = new Date(voucher.boughtDate);
  var options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  var boughtDateString = boughtDate.toLocaleDateString('nl-BE', options);
  let context = {
    voucherNameReceivers: voucher.nameReceivers,
    voucherNameGifters: voucher.nameGifters,
    voucherBoughtDate: boughtDateString,
    voucherAmount: voucher.voucherAmount,
    voucherCustomMessage: voucher.customMessage
  };
  const html = await renderTemplate("voucherMail", context);

  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfBase64 = pdfBuffer.toString("base64");

  return await client.send({
    from: {name: "Restaurant Lots", email: process.env.SENDER_EMAIL},
    to: [{email: voucher.emailRecipient}],
    subject: "Restaurant Lots - Jouw geschenkbon",
    html,
    text: `Dag ${voucher.nameReceivers}, hierbij je geschenkbon van Restaurant Lots.`,
    attachments: [
      {
        filename: `${voucher.id}_voucher.pdf`,
        content: pdfBase64,
        type: "application/pdf",
        disposition: "attachment",
      },
    ],
  });
}

/** Export */
module.exports = {
  sendResApprovalMailClient,
  sendResRefusalMailClient,
  sendResPendingMailClient,
  sendResPendingMailLots,
  sendVoucherMail
}
