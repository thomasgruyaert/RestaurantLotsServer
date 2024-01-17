const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');
const { body, validationResult } = require('express-validator');

const excludedDatesRouter = express.Router();

const authenticate = require('../authenticate');

excludedDatesRouter.use(bodyParser.json());

excludedDatesRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    db.ExcludedDates.findAll(req.query)
    .then((excludedDate) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(excludedDate);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    db.ExcludedDates.create(req.body)
    .then((excludedDate) => {
        console.log('Excluded date Created ', excludedDate);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(excludedDate);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /excludeddates');
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    db.ExcludedDates.remove({})
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));    
});

excludedDatesRouter.route('/:excludedDateId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    const excludedDateId = parseInt(req.params.excludedDateId, 10);
    db.ExcludedDates.findByPk(excludedDateId)
    .then((excludedDate) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(excludedDate);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported on /excludeddates/'+ req.params.excludedDateId);
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /excludeddates/'+ req.params.excludedDateId);
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    const excludedDateId = parseInt(req.params.excludedDateId, 10);
    db.ExcludedDates.destroy({
        where: {id: excludedDateId}
    })
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));
});


module.exports = excludedDatesRouter;