import mongoose from "mongoose";
const url = process.env.MONGODB_URL || "";
const connectedDB = () => {
  try {
    mongoose.connect(url).then((data) => {
      console.log("Database connected success");
    });
  } catch (error) {
    console.log(error);
    setTimeout(connectedDB, 5000);
  }
};

export default connectedDB;
