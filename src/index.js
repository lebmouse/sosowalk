const port = process.env.PORT || 3000;

const express = require("express");
const bodyParser = require("body-parser");
const { prisma } = require("./generated/prisma-client");

const firebase = require('fi')

// Set the configuration for your app
// TODO: Replace with your project's config object
const config = {
  apiKey: "<your-api-key>",
  authDomain: "<your-auth-domain>",
  databaseURL: "<your-database-url>",
  storageBucket: "<your-storage-bucket>"
};
firebase.initializeApp(config);

// Get a reference to the storage service, which is used to create references in your storage bucket
const storage = firebase.storage();

const app = express();

app.use(bodyParser.json());

app.post(`/user`, async (req, res) => {
  const result = await prisma.createUser({
    ...req.body
  });
  res.json(result);
});

app.get("/farms/:farmId/reviews", async (req, res) => {
  const { farmId } = req.params;
  const { page = 1 } = req.query;
  const reivews = await prisma.farm({ first: page, id: farmId }).reviews();
  res.json(reivews);
});

app.post("/farms/:farmId/reviews", async (req, res) => {
  const { farmId } = req.params;
  const { point, content, authorEmail } = req.body;
  const reivews = await prisma.farm({ first: page, id: farmId }).createReview({
    point: point,
    content: content,
    author: { connect: { email: authorEmail } }
  });
  res.json(reivews);
});

app.put("/reviews/:reviewId", async (req, res) => {
  const { reviewId } = req.params;
  const reivews = await prisma.updateReview({
    data: {
      ...req.body
    },
    where: { id: reviewId }
  });
  res.json(reivews);
});

app.listen(port, err => {
  if (err) throw err;
  console.log(`> Ready On Server http://localhost:${port}`);
});
