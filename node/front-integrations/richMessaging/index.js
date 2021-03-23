const express = require("express");
const bodyParser = require("body-parser");
const { config } = require("./config");
const FormData = require("form-data");
const axios = require("axios").default;
const fs = require("fs");
const { resolve } = require("path");
const ULID = require("ulid");
const app = express();

app.use(bodyParser.json());

/**
 * Download image as a stream and save to the local repo
 * @param {*} media_url media url to download image
 */
const downloadImage = async (media_url) => {
  // Here we need to include frontApp Token to download the media from frontApp
  // Otherwise, we will get 401 error
  return axios.get(media_url, {
    headers: { Authorization: `Bearer ${config.FRONT_APP_TOKEN}` },
    responseType: "stream",
  });
};

/**
 * Sending Text Message to frontApp Inbox
 * @param {*} name - Name of the sender
 * @param {*} contact_id - Unique Id of the sender
 * @param {*} body - Text Message that sender is sending
 * @param {*} metadata - Metadata of the message
 * @returns
 */
const sendTextMessageToFrontApp = async (name, contact_id, body, metadata) => {
  const uri = config.FRONT_APP_INCOMING_URI;
  // Please visit this https://dev.frontapp.com/reference/channel-api#post_channels-channel-id-inbound-messages
  // to understand more about the payload that frontApp requires
  const data = {
    sender: {
      name,
      handle: contact_id,
    },
    body,
    metadata,
  };
  try {
    const res = await axios({
      url: uri,
      data: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.FRONT_APP_TOKEN}`,
      },
      method: "POST",
    });
    console.log(`Successfully sending text message to frontApp `);
    return res;
  } catch (err) {
    console.error(`Send unsuccessfully ${JSON.stringify(err)}`);
    throw err;
  }
};

/**
 * Get the allowed media types for a media url
 * @param {*} media_type
 */
const getMediaType = (media_url) => {
  const allowed_types = ["png", "jpg", "jpeg"];
  for (let type of allowed_types) {
    if (media_url.includes(type)) {
      return type;
    }
  }
  return null;
};

/**
 * Sending Media Message to frontApp Inbox
 * @param {*} name - Name of the sender
 * @param {*} contact_id - Unique Id of the sender
 * @param {*} media_url - Media Message that sender is sending
 * @param {*} metadata - Metadata of the message
 * @returns
 */
const sendImageMessageToFrontApp = async (
  name,
  contact_id,
  media_url,
  metadata
) => {
  const uri = config.FRONT_APP_INCOMING_URI;
  // Please visit this https://dev.frontapp.com/reference/channel-api#post_channels-channel-id-inbound-messages
  // to understand more about the payload that frontApp requires
  const formData = new FormData();
  const data = {
    sender: {
      name,
      handle: contact_id,
    },
    body: "Here is an image",
    metadata,
  };

  const mediaType = getMediaType(media_url);

  if (!mediaType) {
    throw "This media type is not accepted";
  }

  const res = await downloadImage(media_url);

  res.data.pipe(
    fs
      .createWriteStream(resolve(`public/${`image.${mediaType}`}`))
      .on("error", () => {
        console.error(`Error: Unable to write stream of image`);
      })
      .on("finish", async () => {
        formData.append(
          "attachments",
          fs.createReadStream(resolve(`public/image.${mediaType}`)),
          `image.${mediaType}`
        );
        for (const key in data) {
          if (typeof data[key] === "object") {
            for (const subKey in data[key]) {
              formData.append(`${key}[${subKey}]`, data[key][subKey]);
            }
          } else {
            formData.append(key, data[key]);
          }
        }

        try {
          const res = await axios({
            url: uri,
            data: formData,
            headers: {
              "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
              Authorization: `Bearer ${config.FRONT_APP_TOKEN}`,
            },
            method: "POST",
          });
          console.log(`Successfully sending image message to frontApp`);
          return res;
        } catch (err) {
          console.error(`Send unsuccessfully ${JSON.stringify(err)}`);
          throw err;
        }
      })
  );
};

/**
 * Sending media message to Sinch
 * @param {*} recipients
 * @param {*} attachments
 */
const sendMediaMessageToSinch = async (recipients, attachments) => {
  console.log(`sending attachments with length of ${attachments.length}`);
  // Download and save the resources from frontApp and save it into public folder
  for (let attachment of attachments) {
    const res = await downloadImage(attachment.url);
    res.data.pipe(
      fs
        .createWriteStream(resolve(`public/${attachment.filename}`))
        .on("error", () => {
          console.error(
            `Error: Unable to write stream of image ${attachment.filename}`
          );
        })
        .on("finish", async () => {
          for (const attachment of attachments) {
            // Please notice that HOST should be using the same host that this app is running
            // If host is not matched, the image can't be found by route controller
            // if you create your own url, you need to specify the value of HOST in .env
            // Read the HOST from .env that will sync with local.js on data update
            fs.readFile(".env", "utf8", async (err, data) => {
              const host = data
                .split("\n")
                .filter((v) => v.includes("HOST"))[0]
                .split("=")[1];
              let res = await sendSinchMessageHelper({
                recipients,
                media_message: {
                  url: `${host}/images/${attachment.filename}`,
                },
              });
              if (res.status === 200) {
                console.log(`Successfully sending image message to Sinch App`);
              }
            });
          }
        })
    );
  }

  return ULID.ulid();
};

/**
 * A helper template to send messages to sinch by passing either Text or Media Message, not both
 * @param {*} recipients An Array of recipients from FrontApp that we wish to send to
 * @param {*} text_message sinch text message payload
 * @param {*} media_message sinch media message payload
 *
 * @example
 * sendSinchMessageHelper({
 *   recipients: [...],
 *   text_message: {text: 'hello world'}
 * })
 */
const sendSinchMessageHelper = async ({
  recipients,
  text_message = null,
  media_message = null,
}) => {
  if (text_message && media_message) {
    throw "Invalid Sinch payload structure. Please select either text_message or media_message, not both";
  }

  const url = `${config.SINCH_APP_BASE_URL()}/${
    config.SINCH_APP_PROJECT_ID
  }/messages:send`;
  for (let recipient of recipients) {
    const { handle } = recipient;
    // Please visit https://developers.sinch.com/reference#messages_sendmessage
    // to understand the payload that Sinch requires.
    try {
      const data = {
        app_id: config.SINCH_APP_APP_ID,
        recipient: {
          contact_id: handle,
        },
        message: {
          text_message: text_message,
          media_message: media_message,
        },
      };
      const res = await axios({
        url,
        data: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json text/plain",
        },
        auth: {
          username: config.SINCH_APP_CLIENT_ID,
          password: config.SINCH_APP_CLIENT_SECRET,
        },
        method: "POST",
      });
      console.log(
        `Sending messages to Sinch App with payload ${JSON.stringify(res.data)}`
      );
      return res;
    } catch (err) {
      console.error(`Something went wrong ${JSON.stringify(err)}`);
    }
  }
};

/**
 * Sending text message to Sinch
 * @param {*} recipients list of recipients to send a message
 * @param {*} text a text message of the sender
 * @returns
 */
const sendTextMessageToSinch = async (recipients, text) => {
  let res = await sendSinchMessageHelper({
    recipients,
    text_message: { text: text.trim() },
  });
  if (res.status === 200) {
    console.log(`Successfully sending text messages to Sinch App`);
  }
  return res.data.id;
};

/**
 * Listen to Api Call from Sinch Notification
 */
app.post("/inbound/sinch", function (req, res) {
  const { message } = req.body;
  if (message) {
    const {
      contact_id,
      conversation_id,
      channel_identity: { channel, identity },
      id,
    } = message;
    const name = `${channel}-${identity}`;
    const text_message = message.contact_message.text_message;
    const media_message = message.contact_message.media_message;
    if (text_message && text_message.text) {
      sendTextMessageToFrontApp(name, contact_id, text_message.text, {
        external_conversation_id: conversation_id,
        external_id: id,
      });
    } else if (media_message && media_message.url) {
      sendImageMessageToFrontApp(name, contact_id, media_message.url, {
        external_conversation_id: conversation_id,
        external_id: id,
      });
    }
  }
  res.status(200).send();
});

/**
 * Receive inbound message from frontApp
 */
app.post(`/inbound/front`, async (req, res) => {
  let {
    recipients,
    text,
    metadata: {
      headers: { in_reply_to },
    },
    attachments,
  } = req.body;
  recipients = recipients.filter((recipient) => recipient.role === "to");
  let external_id;
  // If no attachments from frontApp, we treat as regular text message
  if (attachments.length === 0) {
    external_id = await sendTextMessageToSinch(recipients, text);
  } else {
    external_id = await sendMediaMessageToSinch(recipients, attachments);
  }
  res.json({
    type: "success",
    external_conversation_id: in_reply_to,
    external_id,
  });
});

/**
 * Route controller to get the image resources from public folder
 */
app.get("/images/:imageId", async (req, res) => {
  const param = req.params["imageId"];
  res.sendFile(resolve(`public/${param}`));
});

/**
 * Checking if the environment variable is supplied and not empty string
 * @param {*} variable A variable that needs to be checked
 * @param {*} message An error message that needs to be thrown
 */
const preCheckArgument = (variable, message) => {
  if (!variable || variable === "") {
    throw message;
  }
};

const main = () => {
  preCheckArgument(
    config.FRONT_APP_INCOMING_URI,
    "Front app incoming uri is required"
  );

  preCheckArgument(config.FRONT_APP_TOKEN, "Front app token is required");

  preCheckArgument(
    config.SINCH_APP_ENVIRONMENT,
    "Sinch app region is required"
  );

  preCheckArgument(
    config.SINCH_APP_PROJECT_ID,
    "Sinch app project id is required"
  );

  preCheckArgument(config.SINCH_APP_APP_ID, "Sinch app id is required");

  preCheckArgument(
    config.SINCH_APP_CLIENT_ID,
    "Sinch app client id is required"
  );

  preCheckArgument(
    config.SINCH_APP_CLIENT_SECRET,
    "Sinch app client secret is required"
  );
  app.listen(config.PORT, () => {
    console.log(`Front App listening at http://localhost:${config.PORT}`);
  });
};

main();
