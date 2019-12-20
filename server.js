const express = require("express");
const app = express();
const moment = require("moment");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const db = mongoose.connect(
  process.env.MONGO_URI,
  { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true },
  error => {
    if (error) console.log(error);
    console.log("connection to the DB successful");
  }
);
const userDB = require("./models/user.js");

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that API is remotely testable by FCC 
const cors = require("cors");
app.use(cors());

// basic configuration 
let port = process.env.PORT || 3000;

// this project needs to parse POST bodies--the body-parser mounted here
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// to serve the static CSS file from the public folder by using the
// built-in middleware function in Express
app.use("/", express.static(process.cwd() + "/public"));

// routing--how the app responds to a client request to a particular endpoint
// when the route is matched, the handler function is executed--responds with the index.html file
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// create a new user by posting form data username to /api/exercise/new-user and return an object with the username and the _id
app.post("/api/exercise/new-user", (req, res, next) => {
  const newUsername = req.body.username;
  const data = new userDB({
    username: newUsername
  });

  data.save((err, data) => {
    if (err) {
      if (err.code == 11000) {
        // uniqueness error (no custom message)
        return next({
          status: 400,
          message: "This username is already taken."
        });
      } else {
        return next(err);
      }
    }

    res.send({
      username: newUsername,
      id: data._id
    });
  });
});

// use momentJS to validate dates
const handleDate = date => {
  if (!date) {
    return moment().format("YYYY-MM-DD");
  } else if (!moment(date, "YYYY-MM-DD").isValid()) {
    return moment().format("YYYY-MM-DD");
  } else {
    return date;
  }
};

// get an array of all users and their id's at the path api/exercise/users
app.get("/api/exercise/users", (req, res, next) => {
  userDB.find({}, (err, data) => {
    if (err) {
      res.send("Error reading the database.");
      console.log(err);
    } else {
      let nameAndId = data.map(user => {
        return { username: user.username, id: user._id };
      });
      res.send(nameAndId);
      console.log(data);
    }
  });
});

// add exercise to any user by posting form data userId(_id), description, duration, and optionally date
// if no date supplied, current date is used
// returned will be the user object with the added exercise fields
app.post("/api/exercise/add", (req, res, next) => {
  let userId = req.body.userId;
  let exercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: handleDate(req.body.date)
  };

  userDB.findOneAndUpdate(
    { _id: userId },
    { $push: { exercise: exercise } },
    function(err, data) {
      if (err) return console.log(err);
      console.log(data);
    }
  );

  userDB.findById(userId, (err, data) => {
    if (!data) {
      res.send({ error: "A user not found" });
      console.log(err);
    } else {
      console.log(data);
      data.save((err, data) => {
        if (err) return next(err);
        console.log(err);
        res.send({
          username: data.username,
          exercise: data.exercise
        });
      });
    }
  });
});

// retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id)
// returned will be the user object with added array log and total exercise count
// retrieve part of the log of any user by also passing along optional parameters of from & to or limit
// (Date format = yyyy-mm-dd, limit = int)
app.get("/api/exercise/log", (req, res, next) => {
  let userId = req.query.userId;
  let queries = {
    from: req.query.from,
    to: req.query.to,
    limit: req.query.limit
  };

  // find the correct user by ID
  // handle all possible variations of provided/not provided optional parameters from and to
  userDB.findById(userId, (error, user) => {
    if (!user) {
      res.send({ Error: "User not found." });
    } else {
      let results = user.exercise;

      if (queries.from && queries.to) {
        results = results.filter(
          exercise =>
            exercise.date >= queries.from && exercise.date <= queries.to
        );
      } else if (queries.from) {
        results = results.filter(exercise => exercise.date >= queries.from);
      } else if (queries.to) {
        results = results.filter(exercise => exercise.date <= queries.to);
      }

      if (results.length > queries.limit) {
        results = results.slice(0, queries.limit);
      }

      res.send({
        username: user.username,
        totalExercise: results.length,
        exercise: results
      });
    }
  });
});

// middleware not found
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

// listen for requests
const listener = app.listen(port, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
