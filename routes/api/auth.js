const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
require("dotenv").config();

const { User, schemas } = require("../../models/user");
const { HttpError } = require("../../helpers");
const { authenticate } = require("../../middlewares");

const { SECRET_KEY } = process.env;

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { error } = schemas.registerSchema.validate(req.body);
    if (error) {
      throw HttpError(400, error.message);
    }

    const user = await User.findOne({ email });
    if (user) {
      throw HttpError(409, "Email in use");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({ ...req.body, password: hashPassword });
    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { error } = schemas.loginSchema.validate(req.body);
    if (error) {
      throw HttpError(400, error.message);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw HttpError(401, "Email or password is wrong");
    }

    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw HttpError(401, "Email or password is wrong");
    }

    const payload = { id: user._id };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });

    user.token = token;
    await user.save();

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authenticate, async (req, res, next) => {
  try {
    const { _id } = req.user;

    const user = await User.findById(_id);

    if (!user) {
      next(HttpError(401, "Not authorized"));
    }

    user.token = "";
    await user.save();

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/current", authenticate, async (req, res) => {
  try {
    const { email, subscription } = req.user;
    res.status(200).json({ email, subscription });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
