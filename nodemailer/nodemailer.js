require('dotenv').config();
const hbs = require('nodemailer-express-handlebars');
const nodemailer = require('nodemailer');
const path = require('path');

let transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    secure: true,
    port: process.env.MAIL_HOST,
    auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASS
    }
});

const handlebarOptions = {
    viewEngine: {
        partialsDir: path.resolve('./nodemailer/templates/'),
        defaultLayout: false
    },
    viewPath: path.resolve('./nodemailer/templates/'),
};

transporter.use('compile', hbs(handlebarOptions));

async function sendResApprovalMailClient(requestorEmail, reservation) {
    var reservationDateTime = new Date(reservation.reservedDateTime);
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    var reservationDateString = reservationDateTime.toLocaleTimeString('nl-BE', options);
    mailOptions = {
        from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
        to: requestorEmail,
        subject: `Restaurant Lots - Bevestiging Reservatie #${reservation.id}`,
        template: 'reservationConfirmationClient',
        context: {
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
        .then(success => 'Success')
        .catch(err => { console.log(err); return 'Error'; });
}

async function sendResRefusalMailClient(requestorEmail, refusalReason) {
    mailOptions = {
        from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
        to: requestorEmail,
        subject: `Restaurant Lots - Reservatie geweigerd`,
        template: 'reservationRefusalClient',
        context: {
            refusalReason: refusalReason
        }
    }
    return await transporter.sendMail(mailOptions)
        .then(success => 'Success')
        .catch(err => { console.log(err); return 'Error'; });
}

async function sendResPendingMailClient(requestorEmail) {
    mailOptions = {
        from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
        to: requestorEmail,
        subject: `Restaurant Lots - Reservatie verstuurd`,
        template: 'reservationPendingClient',
    }
    return await transporter.sendMail(mailOptions)
        .then(success => 'Success')
        .catch(err => { console.log(err); return 'Error'; });
}

async function sendVoucherMailClient(requestorEmail) {
    //To Implement
}

async function sendVoucherMailLots() {
    //To Implement
}


async function sendResPendingMailLots(reservation) {
    var reservationDateTime = new Date(reservation.reservedDateTime);
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    var reservationDateString = reservationDateTime.toLocaleTimeString('nl-BE', options);
    mailOptions = {
        from: `Restaurant Lots <${process.env.SENDER_EMAIL}>`,
        to: `${process.env.SENDER_EMAIL}`,
        subject: `Online Reservatie - Aanvraag Reservatie #${reservation.id}`,
        template: 'reservationPendingLots',
        context: {
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
        .then(success => 'Success')
        .catch(err => { console.log(err); return 'Error'; });
}

/** Export */
module.exports = { sendResApprovalMailClient, sendResRefusalMailClient, sendResPendingMailClient, sendResPendingMailLots }