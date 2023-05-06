const { google } = require("googleapis");
const ytdl = require("ytdl-core");
const Channel = require("../models/channel");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const youtube = google.youtube({
  version: "v3",
  auth: "AIzaSyDTgn7DUpWq91xTXvQG72bDwAbKTtBwZ5s",
});

function getAllVideos(channelId, pageToken, videoIds, callback) {
  youtube.search.list(
    {
      part: "id",
      channelId: channelId,
      type: "video",
      maxResults: 50,
      pageToken: pageToken,
    },
    (err, res) => {
      if (err) callback(err, null);
      else {
        res.data.items.forEach((item) => {
          videoIds.push(item.id.videoId);
        });
        if (res.data.nextPageToken)
          getAllVideos(channelId, res.data.nextPageToken, videoIds, callback);
        else callback(null, videoIds);
      }
    }
  );
}

module.exports.postSearchChannel = (req, res, next) => {
  const q = req.body.q;

  const options = {
    part: "id,snippet",
    q: q,
    maxResults: 10,
    type: "channel",
  };

  youtube.search.list(options, (err, response) => {
    if (err) {
      console.error("Error searching for channel:", err);
      res.send({ error: { message: "error" } });
    } else {
      res.send({ result: { lists: response.data.items } });
    }
  });
};
module.exports.postAddChannel = (req, res, next) => {
  const channel = req.body.channel;

  // Sử dụng hàm đệ quy để lấy tất cả các video của một kênh Youtube
  getAllVideos(channel.id.channelId, null, [], (err, videoIds) => {
    if (err) {
      res.send({ error: { message: `Đã xảy ra lỗi: ${err}` } });
    } else {
      const startTime = Date.now();
      Channel.create({
        channelId: channel.id.channelId,
        channelTitle: channel.snippet.channelTitle,
        description: channel.snippet.description,
        thumbnail: channel.snippet.thumbnails.default.url,
        videoIds: videoIds,
      }).then((channel) => {
        Channel.findByIdAndUpdate(channel._id).then(async (channel) => {
          console.log(channel._id);
          const loaderVideoInfos = [];
          let cntVideoInfoLoader = 0;
          const maxProcessPerOne = 8;
          let process = 0;

          for (let i = 0; i < channel.videoIds.length; i++) {
            loaderVideoInfos.push(null);
            process++;
            ytdl
              .getBasicInfo(
                `https://www.youtube.com/watch?v=${channel.videoIds[i]}`
              )
              .then((info) => {
                process--;
                loaderVideoInfos[i] = {
                  title: info.videoDetails.title,
                  videoId: channel.videoIds[i],
                  thumbnailUrl: info.videoDetails.thumbnails[0].url,
                  lengthSeconds: Number(info.videoDetails.lengthSeconds),
                };
                cntVideoInfoLoader++;
                console.log(cntVideoInfoLoader);
              });
            while (process >= maxProcessPerOne) await delay(1000);
          }

          while (cntVideoInfoLoader !== channel.videoIds.length) {
            await delay(3000);
          }
          channel.videoDetails = loaderVideoInfos;
          channel.save().then(() => {
            res.send({
              result: { channel, time: (Date.now() - startTime) / 1000 },
            });
          });
        });
      });
    }
  });
};

module.exports.getAllChannel = (req, res, next) => {
  console.log("in get");
  Channel.find().then((channels) => {
    res.send({ result: { channels } });
  });
};
