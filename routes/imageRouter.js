const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');
const multer = require('multer');
const imageRouter = express.Router();
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' +file.originalname)
    }
});

const imageFileFilter = (req, file, cb) => {
    if(!file.originalname.match(/\.(jpg|jpeg|png|PNG|JPG|JPEG)$/)) {
        return cb(new Error('You can only upload image files!'), false);
    }
    cb(null, true);
};

const upload = multer({ storage: storage, limits: { fileSize: 1 * 1024 * 1024 * 25 }, fileFilter: imageFileFilter}).single('image');

imageRouter.use(bodyParser.json());

imageRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    db.Image.findAll(req.query)
    .then((image) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(image);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyToken, upload, (req, res, next) => {
    req.body.src = "images/" + req.file.filename;
    req.body.fileName = req.file.filename;
    console.log(req.body.src);
    console.log(req.body.fileName);
    db.Image.create(req.body)
    .then((image) => {
        console.log('Image Created ', image);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(image);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /images');
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    db.Image.remove({})
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));    
});

imageRouter.route('/:imageId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    const imageId = parseInt(req.params.imageId, 10);
    db.Image.findByPk(imageId)
    .then((image) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(image);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported on /images/'+ req.params.imageId);
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /images/'+ req.params.imageId);
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    const imageId = parseInt(req.params.imageId, 10);
    db.Image.destroy({
        where: {id: imageId}
    })
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));
});


module.exports = imageRouter;
