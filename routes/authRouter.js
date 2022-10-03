var express = require('express');
var authRouter = express.Router();

const bodyParser = require('body-parser');
const db = require('../models');
const config = require('../config/auth.config');

const cors = require('./cors');
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator');

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

authRouter.use(bodyParser.json());

authRouter.options('*', cors.corsWithOptions, (req, res) => { res.sendStatus(200); } );

authRouter.route('/')
.options(cors.corsWithOptions, authenticate.verifyToken, (req, res) => { res.sendStatus(200); })
.get(cors.corsWithOptions,  (req,res,next) => {
    db.Admin.findAll(req.query)
    .then((image) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(image);
    }, (err) => next(err))
    .catch((err) => next(err));
})

authRouter.post('/login',
body('email').isEmail(),
body('password').isLength({ min: 5 }), cors.corsWithOptions, (req, res, next) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  db.Admin.findOne({
    where: {
      email: req.body.email
    }
  })
    .then(admin => {
      if (!admin) {
        return res.status(404).send({ message: "Admin Not found.", success: false });
      } else {
        var passwordIsValid = bcrypt.compareSync(
          req.body.password,
          admin.password
        );
        console.log("Checking if password is valid");
        if (!passwordIsValid) {
          console.log("Password is not valid");
          return res.status(401).send({
            success: false,
            accessToken: null,
            message: "Invalid Password!"
          });
        } else {
          var token = jwt.sign({ id: admin.id }, config.secret, {
            expiresIn: 86400 // 24 hours
          });
          res.status(200).send({
            success: true,
            id: admin.id,
            email: admin.email,
            accessToken: token
          });
        }
      }
    })
    .catch(err => {
      res.status(500).send({ message: err.message });
    });
});


authRouter.get('/logout', cors.corsWithOptions, (req, res) => {
  if (req.session) {
    req.session.destroy();
    res.clearCookie('session-id');
    res.redirect('/');
  }
  else {
    var err = new Error('You are not logged in!');
    err.status = 403;
    next(err);
  }
});

// authRouter.post('/signup', (req, res) => {
//   db.Admin.create({
//     email: req.body.email,
//     password: bcrypt.hashSync(req.body.password, 8)
//   })
//     .then((admin) => {
//       res.json(admin);
//     })
//     .catch((err) => {
//       res.json(err);
//     });
// });

module.exports = authRouter;
