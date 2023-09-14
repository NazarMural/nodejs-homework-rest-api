const express = require("express");

const { authenticate } = require("../../middlewares");
const { Contact, schemas } = require("../../models/contact");
const { HttpError } = require("../../helpers");

const router = express.Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { _id: owner } = req.user;
    const { page = 1, limit = 2, favorite } = req.query;
    const skip = (page - 1) * limit;

    const result = await Contact.find({ owner }).skip(skip).limit(limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:contactId", authenticate, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const result = await Contact.findById(contactId);

    if (!result) {
      throw HttpError(404, "Not found");
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { error } = schemas.addSchema.validate(req.body);

    if (error) {
      throw HttpError(400, error.message);
    }

    const { _id: owner } = req.user;
    const result = await Contact.create({ ...req.body, owner });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.put("/:contactId", authenticate, async (req, res, next) => {
  try {
    const { error } = schemas.addSchema.validate(req.body);

    if (error) {
      throw HttpError(400, error.message);
    }

    const { contactId } = req.params;
    const result = await Contact.findByIdAndUpdate(contactId, req.body, {
      new: true,
    });

    if (!result) {
      throw HttpError(404, "Not found");
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/:contactId/favorite", authenticate, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const { favorite } = req.body;
    const { error } = schemas.updatedFavotiteSchema.validate(req.body);

    if (error) {
      throw HttpError(400, error.message);
    }

    if (typeof favorite === "undefined") {
      throw HttpError(400, "Missing field favorite");
    }

    const updatedStatusContact = await Contact.findByIdAndUpdate(
      contactId,
      { favorite },
      { new: true }
    );

    if (!updatedStatusContact) {
      throw HttpError(404, "Not found");
    }

    res.json(updatedStatusContact);
  } catch (error) {
    next(error);
  }
});

router.delete("/:contactId", authenticate, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const result = await Contact.findByIdAndDelete(contactId);

    if (!result) {
      throw HttpError(404, "Not found");
    }

    res.json({ message: "contact deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
