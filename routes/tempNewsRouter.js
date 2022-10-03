const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');

const tempNewsRouter = express.Router();

const authenticate = require('../authenticate');

const { body, validationResult } = require('express-validator');

tempNewsRouter.use(bodyParser.json());

tempNewsRouter.route('/')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        db.TempNews.findAll(req.query)
            .then((tempNewsEntity) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(tempNewsEntity);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        console.log(req.body);
        db.TempNews.create(req.body)
            .then((tempNewsEntity) => {
                console.log('Temp news entity Created ', tempNewsEntity);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(tempNewsEntity);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /tempnews');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        db.TempNews.remove({})
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });

tempNewsRouter.route('/:tempNewsEntityId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        const tempNewsEntityId = parseInt(req.params.tempNewsEntityId, 10);
        db.TempNews.findByPk(tempNewsEntityId)
            .then((tempNewsEntity) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(tempNewsEntity);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('POST operation not supported on /tempnews/' + req.params.tempNewsEntityId);
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /tempnews/' + req.params.tempNewsEntityId);
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        const tempNewsEntityId = parseInt(req.params.tempNewsEntityId, 10);
        db.TempNews.destroy({
            where: { id: tempNewsEntityId }
        })
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });


module.exports = tempNewsRouter;