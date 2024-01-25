const express = require('express');
const bodyParser = require('body-parser');
const db = require('../models');
const cors = require('./cors');
const multer = require('multer');
const imageRouter = express.Router();
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator');
const firebase = require('firebase-admin');

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/images');
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + '-' +file.originalname)
//     }
// });

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
    if(!file.originalname.match(/\.(jpg|jpeg|png|PNG|JPG|JPEG)$/)) {
        return cb(new Error('You can only upload image files!'), false);
    }
    cb(null, true);
};

const upload = multer({ storage: storage, limits: { fileSize: 1000000 }, fileFilter: imageFileFilter}).single('image');

imageRouter.use(bodyParser.json());

const serviceAccount = require("../serviceAccountKey.json");

const firebaseConfig = {
    storageBucket: process.env.storageBucket,
    credential: firebase.credential.cert(serviceAccount)
};

firebase.initializeApp(firebaseConfig);

imageRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    db.Image.findAll(req.query)
    .then((images) => {
        images.forEach(image => {
            image.src = `${process.env.firebaseUrl}${encodeURIComponent(image.src)}?alt=media`;
        })
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(images);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyToken, upload, (req, res, next) => {
    if(!req.file){
        res.status(422).end("Image file is required");
    } else if(!req.body.type || ["gallery", "menu"].indexOf(req.body.type) === -1){
        res.status(422).end("Please provide a valid image type");
    } else {
        const bucket = firebase.storage().bucket();
        const imageBuffer = req.file.buffer;
        const timestamp = Date.now();
        const imageName = `${timestamp}_${req.file.originalname.replace(/\s+/g, '_')}`;
        const srcName = `images/${imageName}`;
        const file = bucket.file(srcName);

        req.body.src = srcName;
        req.body.fileName = imageName;

        file.save(imageBuffer).then(() => {
            req.body.src = srcName;
            req.body.fileName = imageName;
            db.Image.create(req.body)
            .then((image) => {
                console.log('Image Created ', image);
                image.src = `${process.env.firebaseUrl}${encodeURIComponent(image.src)}?alt=media`;
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(image);
            }, (err) => next(err))
            .catch((err) => next(err));
    
        }, (err) => next(err)).catch((err) => next(err));
    }
})
.put(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /images');
})
.delete(cors.corsWithOptions, authenticate.verifyToken, (req, res, next) => {
    res.statusCode = 403;
    res.end('DELETE operation not supported on /images');
});

imageRouter.route('/:imageId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    const imageId = parseInt(req.params.imageId, 10);
    db.Image.findByPk(imageId)
    .then((image) => {
        image.src = `${process.env.firebaseUrl}${encodeURIComponent(image.src)}?alt=media`;
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
    db.Image.findByPk(imageId)
    .then((image) => {
        const bucket = firebase.storage().bucket();
        const file = bucket.file(image.src);
        file.delete();
        db.Image.destroy({
            where: {id: imageId}
        })
        .then((resp) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(resp);
        }, (err) => next(err))
        .catch((err) => next(err));
    }, (err) => next(err))
    .catch((err) => next(err));
});


module.exports = imageRouter;
