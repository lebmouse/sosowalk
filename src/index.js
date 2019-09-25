const port = process.env.PORT || 3000;

const express = require("express");
const bodyParser = require("body-parser");
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(port, err => {
  if (err) throw err;
  console.log(`> Ready On Server http://localhost:${port}`);
});
app.get("/", async (req, res) => {
  res.send("api 서버");
});

app.get("/courses", async (req, res) => {
  const allCourse = await prisma.categories().$fragment(`
  fragment CategoryWithCourse on Category {
    id
    title
    subtitle
    openingDate
    closingDate
    openingTime
    closingTime
    courses {
      id
      title
      number
      images
      courseRoute
      departureTime
      capacity
      bookingUsers {
        id
      }
    }
  }  
  `);
  console.log(allCourse);
  allCourse.forEach(category => {
    category.courses.forEach(course => {
      if (course.bookingUsers) {
        course.bookingUsers = course.bookingUsers.length;
      }
    });
  });
  res.json(allCourse);
});

app.get("/courses/:coursesId", async (req, res) => {
  const course = await prisma.course({ id: req.params.coursesId });
  res.json(course);
});

app.post("/courses/:coursesId/reviews", async (req, res) => {
  const newReview = await prisma.createReview({
    content: req.body.content,
    author: {
      connect: { email: req.body.email }
    },
    course: {
      connect: { id: req.params.coursesId }
    }
  });
  res.json(newReview);
});

app.post("/signin", async (req, res) => {
  let user = await prisma.user({ email: req.body.email });
  if (!user) {
    user = await prisma.createUser(req.body);
  }
  res.json(user);
});

app.get("/users/:userId/courses", async (req, res) => {
  const userCourses = await prisma
    .user({ id: req.params.userId })
    .bookingCourse();
  // console.log(userCourses);
  res.json(userCourses);
});

app.get("/fundings", async (req, res) => {
  const fundings = await prisma.fundings();
  res.json(fundings);
});

app.post("/fundings", async (req, res) => {
  const { authorEmail, ...body } = req.body;
  const newFunding = await prisma.createFunding({
    ...body,
    author: {
      connect: { email: authorEmail }
    }
  });
  res.json(newFunding);
});

app.post("/fundings/:fundingId/investors", async (req, res) => {
  
  const newInvestor = await prisma.updateFunding({
    where: { id: req.params.fundingId },
    data: {
      investors: {
        connect: { email: req.body.email }
      }
    }
  });
  res.json(newInvestor);
});
