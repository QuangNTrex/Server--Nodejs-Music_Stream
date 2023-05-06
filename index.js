const express = require("express");
const ytdl = require("ytdl-core");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoDBStore = require("connect-mongodb-session")(session);
const URI =
  "mongodb+srv://devquangnt:quang212511610@cluster0.aiokdwz.mongodb.net/server-audio-video?retryWrites=true&w=majority";

const store = new MongoDBStore({
  uri: URI,
  collection: "sessions",
});

const DownloadRouter = require("./routers/downloads");
const StreamRouter = require("./routers/stream");
const AuthRouter = require("./routers/auth");
const ChannelRouter = require("./routers/channel");
const app = express();
app.use(
  cors({
    origin: ["http://localhost:3001", "http://localhost:3000"],
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
    credentials: true,
  })
);
app.use(express.json());

app.set("trust proxy", 1);

app.use(
  session({
    secret: "the secret",
    saveUninitialized: true,
    cookie: {
      sameSite: "none",
      // secure: process.env.NODE_ENV === "production",
      // secure: false,
      secure: true,
      maxAge: 1000 * 60 * 60,
      // httpOnly: true,
    },
    resave: false,
    store: store,
  })
);

// download

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
app.use("/info", async (req, res, next) => {
  const startTime = Date.now();
  const videoId = req.query.videoId;
  let cnt = 0;
  let maxx = 200;
  let arr = [];
  for (let i = 0; i < maxx; i++) {
    arr.push(null);
    ytdl
      .getBasicInfo(`https://www.youtube.com/watch?v=${videoId}`)
      .then((info) => {
        cnt++;
        console.log(cnt);
        arr[i] = info;
      });
  }
  while (cnt !== maxx) {
    await delay(1000);
  }
  res.send({ time: (Date.now() - startTime) / 1000, info: arr[0] });
});

app.use("/auth", AuthRouter);

app.use("/download", DownloadRouter);

app.use("/stream", StreamRouter);

app.use("/channel", ChannelRouter);

app.listen(5000, () => {
  console.log("server on");
  mongoose.connect(URI).then(() => {
    console.log("connected mongodb!");
  });
});
