const port = process.env.PORT || 3000;

const express = require("express");
const bodyParser = require("body-parser");
const Multer = require("multer");
const multerGoogleStorage = require("multer-google-storage");
const fs = require("fs");
const { prisma } = require("./generated/prisma-client");

const upload = Multer({
  storage: multerGoogleStorage.storageEngine({
    bucket: "smartimage",
    projectID: "imageserver-253203",
    keyFilename: "imageserver-fc3c49a14bf7.json"
  })
});

const app = express();

app.use(bodyParser.json());

app.get("/", async (req, res) => {
  res.send("api 서버");
});

app.post("/upload", upload.single("file"), (req, res) => {
  console.log(req.file);
  res.json({ url: req.file.path });
  // console.log("Upload Image");
  // let file = req.file;
  // if (file) {
  //   console.log(file.path);
  //   uploadImageToStorage(file)
  //     .then(success => {
  //       res.json({ url: file.path });
  //     })
  //     .catch(error => {
  //       console.error(error);
  //     });
  // }
});

app.listen(port, err => {
  if (err) throw err;
  console.log(`> Ready On Server http://localhost:${port}`);
});
