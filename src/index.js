const port = process.env.PORT || 3000;

const express = require("express");
const Multer = require("multer");
const multerGoogleStorage = require("multer-google-storage");
const fs = require("fs");
const { prisma } = require("./generated/prisma-client");
const serviceAccount = require("./imageserver-fc3c49a14bf7.json");
const filename = "/tmp/imageserver-fc3c49a14bf7.json";
fs.writeFileSync(filename, JSON.stringify(serviceAccount));
const upload = Multer({
  storage: multerGoogleStorage.storageEngine({
    bucket: "smartimage",
    projectId: "imageserver-253203",
    keyFilename: filename
  })
});

const app = express();
app.use(express.json());

app.listen(port, err => {
  if (err) throw err;
  console.log(`> Ready On Server http://localhost:${port}`);
});
app.get("/", async (req, res) => {
  res.send("api 서버");
});

app.get("/courses", async (req, res) => {
  const allCourse = await prisma.categories();
  res.json(allCourse);
});
