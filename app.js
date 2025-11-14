const express = require('express');
const path = require('path');
const logger = require('morgan');
const session = require('express-session');
const favicon = require('serve-favicon');
const FileStore = require('session-file-store')(session);
const mysql = require('mysql');
const db = require('./models');
const compression = require('compression');
const helmet = require('helmet');
const PORT = 5000;

const indexRouter = require('./routes/index');
const authRouter = require('./routes/authRouter');
const imageRouter = require('./routes/imageRouter');
const reservationRouter = require('./routes/reservationRouter');
const businessHoursRouter = require('./routes/businessHoursRouter');
const settingsRouter = require('./routes/settingsRouter');
const tempNewsRouter = require('./routes/tempNewsRouter');
const excludedDatesRouter = require('./routes/excludedDatesRouter');
const voucherRouter = require('./routes/voucherRouter');
const cors = require('./routes/cors');

db.sequelize.sync({ force: false })
  .then(() => {
    console.log("Connected correctly to server");
  })
  // .then(() => {
    // app.listen(PORT, () => {
      // console.log(`App listening on PORT ${PORT}`);
    // });
  // });

var app = express();
app.use(helmet());
app.use(compression());
app.use(cors.corsWithOptions);

// Secure traffic only
// app.all('*', (req, res, next) => {
  // if (req.secure) {
    // return next();
  // }
  // else {
    // res.redirect(307, 'https://' + req.hostname + ':' + app.get('secPort') + req.url);
  // }
// });

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/images', imageRouter);
app.use('/api/reservations', reservationRouter);
app.use('/api/businesshours', businessHoursRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/tempnews', tempNewsRouter);
app.use('/api/excludeddates', excludedDatesRouter);
app.use('/api/vouchers', voucherRouter);
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  const response = {
    message: err.message,
  };
  if (req.app.get('env') === 'development') {
    response.error = err;
  }
  res.status(err.status || 500).json(response);
});

module.exports = app;
