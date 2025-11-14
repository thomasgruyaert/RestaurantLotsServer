require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');


const transporterReady = (async () => {
  const hbs = (await import('nodemailer-express-handlebars')).default;
  const transporter = nodemailer.createTransport({
    host: "live.smtp.mailtrap.io",
    port: 587,
    auth: {
      user: "api",
      pass: process.env.MAILTRAP_TOKEN
    },
    debug: true,
    logger: true
  });
  const handlebarOptions = {
    viewEngine: {
      partialsDir: path.resolve('./nodemailer/templates/'),
      defaultLayout: false
    },
    viewPath: path.resolve('./nodemailer/templates/'),
  };
  transporter.use('compile', hbs(handlebarOptions));
  return transporter;
})();

async function sendResApprovalMailClient(requestorEmail, reservation) {
  const transporter = await transporterReady;
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
  var reservationDateString = reservationDateTime.toLocaleTimeString('nl-BE', options);
  const mailOptions = {
    from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
    to: requestorEmail,
    subject: `Restaurant Lots - Bevestiging Reservatie #${reservation.id}`,
    template: 'reservationConfirmationClient',
    context: {
      srcLotsBanner: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/gallery (22).jpeg')}?alt=media`,
      srcLotsLogo: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/Transparent-1.png')}?alt=media`,
      srcLotsLocatie: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/Group-4.png')}?alt=media`,
      srcResApproved: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/approved.png')}?alt=media`,
      reservationFullName: reservation.firstName + " " + reservation.lastName,
      reservationId: reservation.id,
      reservationNPeople: reservation.nPeople,
      reservationMobileNr: reservation.mobileNr,
      reservationEmail: reservation.email,
      reservationDateString: reservationDateString,
      reservationMealType: reservation.mealType === 'dinner' ? 'Diner' : 'Lunch',
      reservationPayWithVoucher: reservation.payWithVoucher ? 'ja' : 'neen',
      reservationAdditionalComments: reservation.additionalComments ? reservation.additionalComments : '/',
    }
  }
  return await transporter.sendMail(mailOptions)
    .then(() => 'Success')
    .catch(err => {
      console.log(err);
      return 'Error';
    });
}

async function sendResRefusalMailClient(requestorEmail, refusalReason) {
  const transporter = await transporterReady;
  const mailOptions = {
    from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
    to: requestorEmail,
    subject: `Restaurant Lots - Reservatie geweigerd`,
    template: 'reservationRefusalClient',
    context: {
      srcLotsBanner: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/gallery (22).jpeg')}?alt=media`,
      srcLotsLogo: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/Transparent-1.png')}?alt=media`,
      srcLotsLocatie: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/Group-4.png')}?alt=media`,
      srcResDenied: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/denied.png')}?alt=media`,
      refusalReason: refusalReason
    }
  }
  return await transporter.sendMail(mailOptions)
    .then(() => 'Success')
    .catch(err => {
      console.log(err);
      return 'Error';
    });
}

async function sendResPendingMailClient(requestorEmail) {
  const transporter = await transporterReady;
  const mailOptions = {
    from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
    to: requestorEmail,
    subject: `Restaurant Lots - Reservatie verstuurd`,
    template: 'reservationPendingClient',
    context: {
      srcLotsBanner: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/gallery (22).jpeg')}?alt=media`,
      srcLotsLogo: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/Transparent-1.png')}?alt=media`,
      srcLotsLocatie: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/Group-4.png')}?alt=media`,
      srcResPending: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/pending.png')}?alt=media`,
    }
  }
  return await transporter.sendMail(mailOptions)
    .then(() => 'Success')
    .catch(err => {
      console.log("send res pending mail to client failed");
      console.log(err);
      return 'Error';
    });
}

async function sendResPendingMailLots(reservation) {
  const transporter = await transporterReady;
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
  var reservationDateString = reservationDateTime.toLocaleTimeString('nl-BE', options);
  const mailOptions = {
    from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
    to: `${process.env.SENDER_EMAIL}`,
    subject: `Online Reservatie - Aanvraag Reservatie #${reservation.id}`,
    template: 'reservationPendingLots',
    context: {
      srcResPending: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/pending.png')}?alt=media`,
      srcLotsBanner: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/gallery (22).jpeg')}?alt=media`,
      srcLotsLogo: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/Transparent-1.png')}?alt=media`,
      srcLotsLocatie: `${process.env.FIREBASE_URL}${encodeURIComponent('mail/reservation/Group-4.png')}?alt=media`,
      reservationFullName: reservation.firstName + " " + reservation.lastName,
      reservationConfirmationCode: reservation.confirmationCode,
      reservationId: reservation.id,
      reservationNPeople: reservation.nPeople,
      reservationMobileNr: reservation.mobileNr,
      reservationEmail: reservation.email,
      reservationDateString: reservationDateString,
      reservationMealType: reservation.mealType === 'dinner' ? 'Diner' : 'Lunch',
      reservationPayWithVoucher: reservation.payWithVoucher ? 'ja' : 'neen',
      reservationAdditionalComments: reservation.additionalComments ? reservation.additionalComments : '/',
    }
  }
  return await transporter.sendMail(mailOptions)
    .then(() => 'Success')
    .catch(err => {
      console.log("send res pending mail lots failed");
      console.log(err);
      return 'Error';
    });
}

async function sendVoucherMail(voucher) {
  const transporter = await transporterReady;
  var boughtDate = new Date(voucher.boughtDate);
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
  var boughtDateString = boughtDate.toLocaleDateString('nl-BE', options);
  const mailOptions = {
    from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
    to: `${voucher.emailRecipient}`,
    subject: `Restaurant Lots - Jouw geschenkbon`,
    template: 'voucherMail',
    context: {
      voucherNameReceivers: voucher.nameReceivers,
      voucherNameGifters: voucher.nameGifters,
      voucherBoughtDate: boughtDateString,
      voucherAmount : voucher.voucherAmount,
      voucherCustomMessage: voucher.customMessage
    }
  }
  return await transporter.sendMail(mailOptions)
    .then(() => 'Success')
    .catch(err => { console.log(err); return 'Error'; });
}

module.exports = {
  sendResApprovalMailClient,
  sendResRefusalMailClient,
  sendResPendingMailClient,
  sendResPendingMailLots,
  sendVoucherMail
};
