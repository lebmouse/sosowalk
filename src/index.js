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
    courses(orderBy: departureTime_ASC) {
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

  const now = new Date();
  allCourse.forEach(category => {
    category.courses.forEach(course => {
      if (course.bookingUsers) {
        course.bookingUsers = course.bookingUsers.length;
      }
      course.activeCourse =
        new Date() - new Date(course.departureTime) > 0 ? false : true;
      course.activeCourse = course.activeCourse
        ? course.capacity <= course.bookingUsers
          ? false
          : true
        : false;
    });
    if (req.query.order == 2) {
      console.log("order 2");
      category.courses.sort((a, b) =>
        a.bookingUsers < b.bookingUsers
          ? -1
          : a.bookingUsers > b.bookingUsers
          ? 1
          : 0
      );
    }
    category.courses.sort((a, b) =>
      a.activeCourse > b.activeCourse
        ? -1
        : a.activeCourse < b.activeCourse
        ? 1
        : 0
    );
  });
  res.json(allCourse);
});

app.get("/courses/:coursesId", async (req, res) => {
  const course = await prisma.course({ id: req.params.coursesId });
  const coursBookingUsers = await prisma
    .course({ id: req.params.coursesId })
    .bookingUsers();
  if (coursBookingUsers) {
    course.bookingUsers = coursBookingUsers.length;
  }
  res.json(course);
});

app.post("/courses/:coursedId/applicants/:userId", async (req, res) => {
  const newApplicant = await prisma.updateCourse({
    where: { id: req.params.coursedId },
    data: {
      bookingUsers: {
        connect: { id: req.params.userId }
      }
    }
  });
  res.json(newApplicant);
});

app.get("/courses/:coursesId/reviews", async (req, res) => {
  const coursesId = req.params.coursesId;
  const query = `
  query {
    reviews(where:{course:{id:"${coursesId}"}}){
      id
      createdAt
      content
      image
      author {
        id
        name
      }
    }
  }
  `;

  const reviews = await prisma.$graphql(query);
  console.log(reviews);
  res.json(reviews);
});

app.post("/courses/:coursesId/reviews", async (req, res) => {
  const newReview = await prisma.createReview({
    content: req.body.content,
    author: {
      connect: { id: req.body.userId }
    },
    course: {
      connect: { id: req.params.coursesId }
    }
  }).$fragment(`
  fragment reviewWithAuthor on Review {
    id
    createdAt
    content
    image
    author {
      id
      name
      stamp
    }
  }
  `);
  const { stamp: _stamp } = newReview.author;
  const updatedUser = await prisma.updateUser({
    where: { id: req.body.userId },
    data: { stamp: _stamp + 1 }
  });
  res.status(201).json({ review: newReview, user: updatedUser });
});

app.post("/signin", async (req, res) => {
  let user = await prisma.user({ email: req.body.email });
  if (!user) {
    user = await prisma.createUser(req.body);
  }
  res.json(user);
});

app.get("/users/:userId", async (req, res) => {
  const user = await prisma.user({ id: req.params.userId });
  res.status(200).json(user);
});

app.put("/users/:userId", async (req, res) => {
  const updateUser = await prisma.updateUser({
    data: {
      ...req.body
    },
    where: {
      id: req.params.userId
    }
  });
  res.json(updateUser);
});

app.get("/users/:userId/courses", async (req, res) => {
  const userCourses = await prisma
    .user({ id: req.params.userId })
    .bookingCourse()
    .$fragment(
      `
      fragment bookingCourses on Course{
        id
        number
        title
        departureStation
        departureTime
        departureArea
        courseRoute
        nextStation
        prevStation
        courseLength
        images
        capacity
        bookingUsers {
          id
        }
      }
      `
    );
  const newUserCourses = userCourses.map(course => {
    course.bookingUsers = course.bookingUsers.length;
    return course;
  });
  res.json(newUserCourses);
});

app.get("/courses/:coursesId", async (req, res) => {
  const course = await prisma.course({ id: req.params.coursesId });
  res.json(course);
});

app.post("/courses/:coursedId/applicants/:userId", async (req, res) => {
  const newApplicant = await prisma.updateCourse({
    where: { id: req.params.coursedId },
    data: {
      bookingUsers: {
        connect: { id: req.params.userId }
      }
    }
  });
  res.json(newApplicant);
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

app.put("/users/:userId", async (req, res) => {
  const updateUser = await prisma.updateUser({
    data: {
      ...req.body
    },
    where: {
      id: req.params.userId
    }
  });
  res.json(updateUser);
});

// app.get("/users/:userId/courses", async (req, res) => {
//   const userCourses = await prisma
//     .user({ id: req.params.userId })
//     .bookingCourse();
//   // console.log(userCourses);
//   res.json(userCourses);
// });

app.get("/fundings", async (req, res) => {
  const fundings = await prisma.fundings().$fragment(`
  fragment fundingWithUser on Funding {
    id
    title
    emoji
    content
    createdAt
    deadline
    investors {
      id
    }
  }
`);

  res.json(
    fundings.map(funding => {
      funding["achievementRate"] = funding.investors.length;
      funding.investors = null;
      delete funding.investors;
      const dDay = new Date(funding.deadline) - new Date();
      funding["dDay"] = new Date(dDay).getDate();
      return funding;
    })
  );
});

app.post("/fundings", async (req, res) => {
  const { userId, ...body } = req.body;
  const nowDate = new Date();
  body.deadline = new Date(nowDate.setDate(nowDate.getDate() + 14));
  const newFunding = await prisma.createFunding({
    ...body,
    author: {
      connect: { id: userId }
    }
  });
  res.json(newFunding);
});

app.get("/fundings/:fundingId", async (req, res) => {
  const funding = await prisma.funding({ id: req.params.fundingId }).$fragment(`
    fragment fundingWithUser on Funding {
      id
      title
      emoji
      content
      createdAt
      deadline
      author {
        name
      }
    }
  `);
  const investors = await prisma
    .funding({ id: req.params.fundingId })
    .investors();
  if (investors || investors.length) {
    funding["achievementRate"] = investors.length;
  }
  const dDay = new Date(funding.deadline) - new Date();
  funding["dDay"] = new Date(dDay).getDate();
  res.json(funding);
});

app.post("/fundings/:fundingId/investors/:userId", async (req, res) => {
  const newInvestor = await prisma.updateFunding({
    where: { id: req.params.fundingId },
    data: {
      investors: {
        connect: { id: req.params.userId }
      }
    }
  });
  res.json(newInvestor);
});
