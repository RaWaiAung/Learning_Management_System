import { app } from "./app";
import connectedDB from "./utils/db";
require("dotenv").config();
// create server

app.listen(process.env.PORT, () => {
  console.log(`Server running ${process.env.PORT}`);
  connectedDB();
});
