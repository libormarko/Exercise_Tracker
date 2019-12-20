const mongoose = require("mongoose");

// create a new user Schema that allows to create an instance of objects--documents
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      maxlength: [20, "Username is too long"]
    },
    exercise: [
      {
        _id: false,
        description: String,
        duration: Number,
        date: {}
      }
    ]
  },
  { timestamps: true }
);

const userModel = mongoose.model("username", userSchema);
module.exports = userModel;