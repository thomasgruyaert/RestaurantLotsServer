const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');

const settingsRouter = express.Router();

const authenticate = require('../authenticate');

settingsRouter.use(bodyParser.json());

settingsRouter.route('/')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        db.Settings.findAll(req.query)
            .then((setting) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(setting);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        console.log(req.body);
        db.Settings.create(req.body)
            .then((setting) => {
                console.log('Setting Created ', setting);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(setting);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /settings');
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        db.Settings.remove({})
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });

settingsRouter.route('/:settingId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        const settingId = parseInt(req.params.settingId, 10);
        db.Settings.findByPk(settingId)
            .then((setting) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(setting);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        res.statusCode = 403;
        res.end('POST operation not supported on /settings/' + req.params.settingId);
    })
    .put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        const settingId = parseInt(req.params.settingId, 10);
        db.Settings.update(req.body, { where: { id: settingId } })
            .then((setting) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(setting);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
        const settingId = parseInt(settingId, 10);
        db.Settings.destroy({
            where: { id: settingId }
        })
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });


module.exports = settingsRouter;
