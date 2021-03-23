const express = require("express");
const bodyParser = require("body-parser");
const { config } = require("./config");
const axios = require("axios");
const app = express();

app.use(bodyParser.json());

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
    return axios({
      url: uri,
      data: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.FRONT_APP_TOKEN}`,
      },
      method: "POST",
    });
  } catch (err) {
    console.error(`Something wrong ${JSON.stringify(err)}`);
    throw err;
  }
};

/**
 * Sending text message to Sinch
 * @param {*} recipients list of recipients to send a message
 * @param {*} text a text message of the sender
 * @returns
 */
const sendTextMessageToSinch = async (recipients, text) => {
  const url = `${config.SINCH_APP_BASE_URL()}/${
    config.SINCH_APP_PROJECT_ID
  }/messages:send`;
  for (let recipient of recipients) {
    const { handle } = recipient;
    try {
      // Please visit https://developers.sinch.com/reference#messages_sendmessage
      // to understand the payload that Sinch requires.
      const data = {
        app_id: config.SINCH_APP_APP_ID,
        recipient: {
          contact_id: handle,
        },
        message: {
          text_message: { text: text.trim() },
        },
      };
      const res = await axios({
        url,
        data: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json text/plain",
        },
        method: "POST",
        auth: {
          username: config.SINCH_APP_CLIENT_ID,
          password: config.SINCH_APP_CLIENT_SECRET,
        },
      });
      return res.data.message_id;
    } catch (err) {
      console.error(`Something went wrong ${JSON.stringify(err)}`);
    }
  }
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
      contact_message: {
        text_message: { text },
      },
    } = message;
    const name = `${channel}-${identity}`;
    if (text) {
      /**
       * Here we use contact_id that generalizes different channels.
       * However, we can use phone-number (identity) if we only use SMS, or WhatsApp for example.
       */
      sendTextMessageToFrontApp(name, contact_id, text, {
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
  } = req.body;
  recipients = recipients.filter((recipient) => recipient.role === "to");
  // external id is the unique id of a message that frontApp needs to be acknowledged
  const external_id = await sendTextMessageToSinch(recipients, text);
  /**
   * Please reference to https://dev.frontapp.com/docs/channels-getting-started
   * to have a view of what payload that frontApp requests.
   */
  res.json({
    type: "success",
    // External conversation id is parent object of the message
    // In this case, it will be whose the message it is trying to reply to
    external_conversation_id: in_reply_to,
    external_id,
  });
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
    console.log(`App is running at http://localhost:${config.PORT}`);
  });
};

main();
