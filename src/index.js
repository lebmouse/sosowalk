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
  const reviews = await prisma.createReview({
    content: req.body.content,
    author: {
      connect: { email: req.body.email }
    },
    course: {
      connect: { id: req.params.coursesId }
    }
  });
});

app.post("/signin", async (req, res) => {
  const user = await prisma.user({ email: req.body.email });
  if (user) {
    user = await prisma.createUser(req.body);
  }
  res.json(user);
});

app.get("users/:userId/courses", async (req, res) => {
  const userCourses = await prisma
    .user({ id: req.params.userId })
    .bookingCourse();
  res.json(userCourses);
});

app.get("/fundings", async (req, res) => {
  const fundings = await prisma.fundings();
  res.json(fundings);
});

app.post("/fundings", async (req, res) => {
  const newFunding = await prisma.createFunding(req.body);
  res.json(newFunding);
});

app.post("/fundings/:fundingId/investors", async (req, res) => {
  const newInvestor = await prisma.updateFunding({
    data: {
      investors: {
        connect: { email: req.body.email }
      }
    },
    where: { id: req.params.fundingId }
  });
  res.json(newInvestor);
});

