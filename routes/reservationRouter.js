const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');
const reservationRouter = express.Router();
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator');
const { sendResApprovalMailClient, sendResRefusalMailClient, sendResPendingMailClient, sendResPendingMailLots } = require('../nodemailer/nodemailer');
const randtoken = require('rand-token');

reservationRouter.use(bodyParser.json());

reservationRouter.route('/')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyToken, (req, res, next) => {
        db.Reservation.findAll(req.query)
            .then((reservation) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(reservation);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions,
        body('lastName').isLength({ min: 2 }).withMessage("Gelieve een geldige achternaam op te geven"),
        body('firstName').isLength({ min: 2 }).withMessage("Gelieve een geldige voornaam op te geven"),
        body('mobileNr').isMobilePhone().withMessage("Gelieve een geldig telefoonnummer op te geven"),
        body('reservedDateTime').isISO8601().toDate().withMessage("Gelieve een geldige reserveerdatum en -tijd op te geven"),
        body('email').isEmail().withMessage("Gelieve een geldig emailadres op te geven.").custom((value, { req }) => {
            var reservedDateString = new Date(req.body.reservedDateTime).toISOString().split('T')[0];
            return db.sequelize.query("SELECT * FROM Reservations where date(reservedDateTime) = '" + reservedDateString + "' and email='" + value + "' and mealType = '" + req.body.mealType + "';",
            { type: db.sequelize.QueryTypes.SELECT })
            .then((results) => {
                if(results && results.length > 0){
                    throw new Error("Er is reeds een reservatie aangevraagd op het huidige emailadres");
                }
            }, (err) => next(err))}),
        body('mealType').isIn(['lunch', 'dinner']).withMessage("Gelieve een geldig type op te geven"),
        body('status').isIn(['pending', 'approved']).withMessage('Gelieve een geldige status mee te geven'),
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            var token = randtoken.generate(32);
            var requestBody = req.body;
            requestBody["confirmationCode"] = token;
            
            db.Reservation.create(req.body)
                .then((reservation) => {
                    sendResPendingMailClient(reservation.email)
                        .then((response) => {
                            if (response !== 'Success') {
                                res.status(500).send({ error: 'Error' });
                            }
                        }, (err) => next(err));
                    sendResPendingMailLots(reservation)
                        .then((response) => {
                            if (response !== 'Success') {
                                res.status(500).send({ error: 'Error' });
                            }
                        }, (err) => next(err));
                    console.log('Reservation Created ', reservation);
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(reservation);
                }, (err) => next(err))
                .catch((err) => next(err));
        })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /reservations');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        db.Reservation.destroy({})
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });

reservationRouter.route('/timeslotsinfo')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        db.sequelize.query('SET @maxPersonenPerTimeslot = (SELECT settingValue from Settings where settingName = "maxPeoplePerTimeslot");')
            .then((response) => {
                db.sequelize.query('select reservedDateTime, @maxPersonenPerTimeslot as maxPersonenPerTimeslot, sum(nPeople) as aantalBezet, @maxPersonenPerTimeslot-sum(nPeople) as aantalPlaatsenVrijTijdsSlot from Reservations where status in ("pending","approved") group by reservedDateTime;',
                    { type: db.sequelize.QueryTypes.SELECT })
                    .then((reservationsTimeSlotsInfo) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(reservationsTimeSlotsInfo);
                    }, (err) => next(err))
                    .catch((err) => next(err));
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('POST operation not supported on /reservations/timeslotsinfo');
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /reservations/timeslotsinfo');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('DELETE operation not supported on /reservations/timeslotsinfo');
    });

reservationRouter.route('/dateinfo')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        db.sequelize.query('SET @maxPersonenTotaal = (SELECT settingValue from Settings where settingName = "maxPeopleTotal");')
            .then(() => {
                db.sequelize.query('select DATE(reservedDateTime) as reservedDate, @maxPersonenTotaal as maxPersonenTotaal, sum(nPeople) as aantalBezet, @maxPersonenTotaal-sum(nPeople) as aantalPlaatsenVrijDatum, mealType from Reservations where status in ("pending","approved") group by DAY(reservedDateTime), mealType;',
                    { type: db.sequelize.QueryTypes.SELECT })
                    .then((reservationDateInfo) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(reservationDateInfo);
                    }, (err) => next(err))
                    .catch((err) => next(err));
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('POST operation not supported on /reservations/dateinfo');
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /reservations/dateinfo');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('DELETE operation not supported on /reservations/dateinfo');
    });

//Feedback with token
reservationRouter.route('/:reservationId/approve/:confirmId').options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        res.statusCode = 403;
        res.end('GET operation not supported on /reservations/' + req.params.reservationId + '/approve/' + req.params.confirmId);
    })
    .post(cors.corsWithOptions, (req, res, next) => {
        const reservationId = parseInt(req.params.reservationId, 10);
        db.Reservation.update({ status: "approved" }, { where: { id: reservationId, confirmationCode: req.params.confirmId } })
            .then(() => {
                db.Reservation.findByPk(reservationId)
                    .then((reservation) => {
                        sendResApprovalMailClient(reservation.email, reservation)
                            .then((response) => {
                                if (response === 'Success') {
                                    res.status(200).send("Success");
                                } else {
                                    res.status(500).send({ error: 'Error' });
                                }
                            }, (err) => next(err))
                    }, (err) => next(err))
                    .catch((err) => next(err));
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /reservations/' + req.params.reservationId + '/approve/' + req.params.confirmId);
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('DELETE operation not supported on /reservations/' + req.params.reservationId + '/approve/' + req.params.confirmId);
    });

reservationRouter.route('/:reservationId/refuse/:confirmId').options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        res.statusCode = 403;
        res.end('GET operation not supported on /reservations/' + req.params.reservationId + '/refuse/' + req.params.confirmId);
    })
    .post(cors.corsWithOptions, (req, res, next) => {
        const reservationId = parseInt(req.params.reservationId, 10);
        db.Reservation.update({ status: "refused" }, { where: { id: reservationId, confirmationCode: req.params.confirmId } })
            .then(() => {
                db.Reservation.findByPk(reservationId)
                    .then((reservation) => {
                        sendResRefusalMailClient(reservation.email, req.body.refusalReason)
                            .then((response) => {
                                if (response === 'Success') {
                                    res.status(200).send("Success");
                                } else {
                                    res.status(500).send({ error: 'Error' });
                                }
                            }, (err) => next(err))
                    }, (err) => next(err))
                    .catch((err) => next(err));
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .put(cors.corsWithOptions, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /reservations/' + req.params.reservationId + '/refuse/' + req.params.confirmId);
    })
    .delete(cors.corsWithOptions, (req, res, next) => {
        res.statusCode = 403;
        res.end('DELETE operation not supported on /reservations/' + req.params.reservationId + '/refuse/' + req.params.confirmId);
    });

reservationRouter.route('/:reservationId/approve').options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('GET operation not supported on /reservations/' + req.params.reservationId + '/approve');
    })
    .post(cors.corsWithOptions,
        authenticate.verifyToken,
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const reservationId = parseInt(req.params.reservationId, 10);
            db.Reservation.update({ status: "approved" }, { where: { id: reservationId } })
                .then(() => {
                    db.Reservation.findByPk(reservationId)
                        .then((reservation) => {
                            sendResApprovalMailClient(reservation.email, reservation)
                                .then((response) => {
                                    if (response === 'Success') {
                                        res.status(200).send("Success");
                                    } else {
                                        res.status(500).send({ error: 'Error' });
                                    }
                                }, (err) => next(err))
                        }, (err) => next(err))
                        .catch((err) => next(err));

                }, (err) => next(err))
                .catch((err) => next(err));
        })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /reservations/' + req.params.reservationId + '/approve');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('DELETE operation not supported on /reservations/' + req.params.reservationId + '/approve');
    });

reservationRouter.route('/:reservationId/refuse').options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('GET operation not supported on /reservations/' + req.params.reservationId + '/refuse');
    })
    .post(cors.corsWithOptions,
        authenticate.verifyToken,
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const reservationId = parseInt(req.params.reservationId, 10);
            db.Reservation.update({ status: "refused" }, { where: { id: reservationId } })
                .then(() => {
                    db.Reservation.findByPk(reservationId)
                        .then((reservation) => {
                            sendResRefusalMailClient(reservation.email, req.body.refusalReason)
                                .then((response) => {
                                    if (response === 'Success') {
                                        res.status(200).send("Success");
                                    } else {
                                        res.status(500).send({ error: 'Error' });
                                    }
                                }, (err) => next(err))
                        }, (err) => next(err))
                        .catch((err) => next(err));

                }, (err) => next(err))
                .catch((err) => next(err));
        })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /reservations/' + req.params.reservationId + '/refuse');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('DELETE operation not supported on /reservations/' + req.params.reservationId + '/refuse');
    });
reservationRouter.route('/:reservationId/:confirmId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        const reservationId = parseInt(req.params.reservationId, 10);
        db.Reservation.findByPk(reservationId)
            .then((reservation) => {
                if (reservation.confirmationCode != req.params.confirmId) {
                    res.statusCode = 401;
                    res.end('Invalid confirmation token on /reservations/' + req.params.reservationId + '/' + req.params.confirmId);
                } else {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(reservation);
                }
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, (req, res, next) => {
        res.statusCode = 403;
        res.end('POST operation not supported on /reservations/' + req.params.reservationId + '/' + req.params.confirmId);
    })
    .put(cors.corsWithOptions, (req, res, next) => {
        const reservationId = parseInt(req.params.reservationId, 10);
        db.Reservation.update(req.body, { where: { id: reservationId } })
            .then((reservation) => {
                if (reservation.confirmationCode != req.params.confirmId) {
                    res.statusCode = 401;
                    res.end('Invalid confirmation token on /reservations/' + req.params.reservationId + '/' + req.params.confirmId);
                } else {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(reservation);
                }

            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        const reservationId = parseInt(req.params.reservationId, 10);
        db.Reservation.destroy({
            where: { id: reservationId, confirmationCode: req.params.confirmId }
        })
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });

reservationRouter.route('/:reservationId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, authenticate.verifyToken, (req, res, next) => {
        const reservationId = parseInt(req.params.reservationId, 10);
        db.Reservation.findByPk(reservationId)
            .then((reservation) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(reservation);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('POST operation not supported on /reservations/' + req.params.reservationId);
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        const reservationId = parseInt(req.params.reservationId, 10);
        db.Reservation.update(req.body, { where: { id: reservationId } })
            .then((reservation) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(reservation);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        const reservationId = parseInt(req.params.reservationId, 10);
        db.Reservation.destroy({
            where: { id: reservationId }
        })
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });






module.exports = reservationRouter;
