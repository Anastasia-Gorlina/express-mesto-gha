const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const NotFoundError = require('../errors/not-found-error');
const BadRequestError = require('../errors/bad-request-error');
const ConflictError = require('../errors/conflict-error');

// возвращает всех пользователей
module.exports.getUsers = (request, response, next) => User.find({})
  .then((users) => response.status(200).send({ data: users }))
  .catch(next);

// возвращает пользователя по _id
module.exports.getUserId = (request, response, next) => {
  const idUser = request.params.id;
  User.findById(idUser)
    .then((userFound) => {
      if (!userFound) {
        throw new NotFoundError(`Запрашиваемый пользователь с id ${idUser} не найден`);
      }
      return response.status(200).json(userFound);
    })
    .catch((error) => {
      if (error.name === 'ValidationError') {
        next(new BadRequestError(`${Object.values(error.errors).map((err) => err.message).join(', ')}`));
      } else if (error.name === 'CastError') {
        next(new BadRequestError(`Переданный id ${idUser} не корректен`));
      } else {
        next(error);
      }
    });
};

// создание пользователя, signup
module.exports.createUser = (request, response, next) => {
  const {
    name, about, avatar, email, password,
  } = request.body;
  bcrypt
    .hash(password, 10)
    .then((hash) => User.create({
      name, about, avatar, email, password: hash,
    }))
    .then((user) => response.status(201).send(user))
    .catch((error) => {
      console.log(error.name);
      if (error.name === 'ValidationError') {
        next(new BadRequestError(`${Object.values(error.errors).map((err) => err.message).join(', ')}`));
      } else if (error.code === 11000) {
        next(new ConflictError('Пользователь с таким email уже существует'));
      } else {
        next(error);
      }
    });
};

// login
module.exports.login = (request, response, next) => {
  const { email, password } = request.body;
  return User.findUserByCredentials(email, password)
    .then((user) => {
      const token = jwt.sign({ _id: user._id }, 'super-strong-secret');
      response
        .cookie('jwt', token, {
          maxAge: 3600000 * 24 * 7,
          httpOnly: true,
          sameSite: true,
        })
        .send({ data: user.toJSON() });
    })
    .catch(next);
};

module.exports.signout = (req, res) => {
  res
    .status(200)
    .clearCookie('jwt')
    .send({ message: 'Выход' });
};

// информация о текущем пользователе
module.exports.getUser = (request, response, next) => {
  const userId = request.user._id;
  User.findById(userId)
    .then((user) => {
      if (user) {
        return response.send({
          data: user,
        });
      }
      throw new NotFoundError('Пользователь по указанному id не найден');
    })
    .catch(next);
};

// обновление профиля
module.exports.updateUser = (request, response, next) => User.findByIdAndUpdate(
  request.user._id,
  { name: request.body.name, about: request.body.about },
  { new: true, runValidators: true },
)
  .then((userUpdate) => {
    if (!userUpdate) {
      throw new NotFoundError(`Запрашиваемый пользователь с id ${request.user._id} не найден`);
    }
    return response.send({ data: userUpdate });
  })
  .catch((error) => {
    if (error.name === 'ValidationError') {
      next(new BadRequestError(`${Object.values(error.errors).map((err) => err.message).join(', ')}`));
    } else {
      next(error);
    }
  });

// обновление аватара
module.exports.updateAvatar = (request, response, next) => User.findByIdAndUpdate(
  request.user._id,
  { avatar: request.body.avatar },
  { new: true, runValidators: true },
)
  .then((avatarUpdate) => {
    if (!avatarUpdate) {
      throw new NotFoundError(`Запрашиваемый пользователь с id ${request.user._id} не найден`);
    }
    return response.send({ data: avatarUpdate });
  })
  .catch((error) => {
    if (error.name === 'ValidationError') {
      next(new BadRequestError(`${Object.values(error.errors).map((err) => err.message).join(', ')}`));
    } else {
      next(error);
    }
  });
