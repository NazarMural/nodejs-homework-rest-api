const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const express = require("express");
const gravatar = require("gravatar");
const multer = require("multer");
const path = require("path");
const jimp = require("jimp");
const fs = require("fs/promises");
require("dotenv").config();

const router = express.Router();

const { User, schemas } = require("../../models/user");
const { HttpError } = require("../../helpers");
const { authenticate } = require("../../middlewares");

const { SECRET_KEY } = process.env;

const tempDir = path.join(__dirname, "../", "../", "temp");
const avatarsDir = path.join(__dirname, "../", "../", "public", "avatars");

const multerConfig = multer.diskStorage({
  destination: tempDir,
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: multerConfig });

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

    const avatarURL = gravatar.url(email, { s: "200", r: "pg", d: "mm" });

    const newUser = await User.create({
      ...req.body,
      password: hashPassword,
      avatarURL,
    });

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

router.patch(
  "/avatars",
  authenticate,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const { _id } = req.user;

      if (!req.file) {
        throw HttpError(400, "missing file");
      }

      const { path: tempUpload, originalname } = req.file;

      const image = await jimp.read(tempUpload);
      image.resize(250, 250);
      await image.writeAsync(tempUpload);

      const filename = `${_id}_${originalname}`;
      const resultUpload = path.join(avatarsDir, filename);
      await fs.rename(tempUpload, resultUpload);

      const avatarURL = path.join("avatars", filename);
      await User.findByIdAndUpdate(_id, { avatarURL });

      res.json({
        avatarURL,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
