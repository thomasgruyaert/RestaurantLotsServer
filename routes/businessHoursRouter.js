const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');
const businessHoursRouter = express.Router();
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator');

businessHoursRouter.use(bodyParser.json());

businessHoursRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    db.BusinessHours.findAll(req.query)
    .then((businessHours) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(businessHours);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported on /businesshours');
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /businesshours');
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    db.BusinessHours.remove({})
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));    
});

businessHoursRouter.route('/:weekdayId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    const weekdayId = parseInt(req.params.weekdayId, 10);
    db.BusinessHours.findByPk(weekdayId)
    .then((businessHours) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(businessHours);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported on /businesshours/'+ req.params.weekdayId);
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    const weekdayId = parseInt(req.params.weekdayId, 10);
    db.BusinessHours.update(req.body, { where: { weekdayId: weekdayId} })
    .then((businessHours) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(businessHours);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    const weekdayId = parseInt(req.params.weekdayId, 10);
    db.BusinessHours.destroy({
        where: {weekdayId: weekdayId}
    })
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));
});


module.exports = businessHoursRouter;
