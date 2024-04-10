const Photo = require("../models/photo.model");
const Voter = require("../models/Voter.model");
const sanitize = require("mongo-sanitize");
const requestIp = require("request-ip");

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if (title && author && email && file) {
      // if fields are not empty...

      const emailPattern = new RegExp(/^[a-zA-Z.]+@[a-zA-Z]+\.[a-zA-Z]+$/);
      const stringPattern = new RegExp(/^[a-zA-Z0-9.,! ]+$/);

      if (
        !email.match(emailPattern) ||
        !author.match(stringPattern) ||
        !title.match(stringPattern)
      ) {
        throw new Error("Wrong input!");
      }

      const fileName = file.path.split("/").slice(-1)[0];
      const fileExt = fileName.split(".").slice(-1)[0];
      if (
        (fileExt === "gif" || fileExt === "jpg" || fileExt === "png") &&
        title.length <= 25 &&
        author.length <= 50
      ) {
        const titleClean = sanitize(title);
        const authorClean = sanitize(author);
        const emailClean = sanitize(email);

        const newPhoto = new Photo({
          title: titleClean,
          author: authorClean,
          email: emailClean,
          src: fileName,
          votes: 0,
        });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error("Wrong input!");
      }
    } else {
      throw new Error("Wrong input!");
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if (!photoToUpdate) res.status(404).json({ message: "Not found" });
    else {
      const clientIp = requestIp.getClientIp(req);
      const userVoted = await Voter.findOne({ user: clientIp });

      if (!userVoted) {
        const newVoter = new Voter({
          user: clientIp,
          votes: photoToUpdate._id,
        });
        newVoter.save();

        photoToUpdate.votes++;
        photoToUpdate.save();
        res.send({ message: "OK" });
      } else if (userVoted) {
        if (!userVoted.votes.includes(photoToUpdate._id)) {
          userVoted.votes.push(photoToUpdate._id);
          userVoted.save();

          photoToUpdate.votes++;
          photoToUpdate.save();
          res.send({ message: "OK" });
        } else {
          res.status(500).json(err);
        }
      }
    }
  } catch (err) {
    res.status(500).json(err);
  }
};
