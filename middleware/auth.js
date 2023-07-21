const jwt = require('jsonwebtoken');
const UnauthorizedError = require('../errors/unauthorized-error');
const cookieParser = require('cookie-parser');
const express = require('express');

const app = express();
app.use(cookieParser());

const auth = (req, res, next) => {
  const token = req.cookies.jwt;
  let payload;

  try {
    payload = jwt.verify(token, 'super-strong-secret');
  } catch (err) {
    next(new UnauthorizedError('Необходима авторизация'));
  }

  req.user = payload;

  next();
};

module.exports = auth;
