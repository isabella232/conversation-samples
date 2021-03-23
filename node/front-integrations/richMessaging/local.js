/**
 * For the sake of convenience, we have this local.js to help you with setting up
 * ngrok which exposes this application to webhook that is available for incoming messages
 * from both Sinch and FrontApp. However, please notice that whenever you re-run this local.js
 * a new ngrok is generated , and you will need to update the new ngrok to frontApp. You don't need
 * worry about Sinch webhook, since this script will create a webhook when you launch the script, and
 * delete the webhook when you exit the script.
 */

const nodemon = require("nodemon");
const ngrok = require("ngrok");
const { config } = require("./config");
const { ulid } = require("ulid");
const axios = require("axios");
const fs = require("fs");

// A generated ngrok url that will expose our app to public
let webhookUrl = null;

// This holds the id of the webhook which is used to delete webhook
// when the application exits
let webhookId = null;

/**
 * Nodemon listen to the changes of index.js
 * and automatically restart the server if something changes
 */
nodemon({
  script: "index.js",
  ext: "js",
});

/**
 * When you run local, we have set up automatically webhook that is generated
 * by Ngrok URL to Sinch Dashboard. Please knowing that, if you run with local,
 * you will get the new webhook every time you start the app. Thus, you also need to
 * update the webhook to frontApp dashboard as well.
 */
nodemon.on("start", async () => {
  if (!webhookUrl) {
    webhookUrl = await ngrok.connect({ port: config.PORT });
    createSinchAppSubscriptionWebhook();
    fs.readFile(".env", "utf8", (err, data) => {
      if (!err) {
        data = [
          ...data.split("\n").filter((v) => !v.includes("HOST")),
          `HOST=${webhookUrl}`,
        ].join("\n");
        fs.writeFile(".env", data, (err) => {});
      }
    });
  }

  console.log(`Server now available at ${webhookUrl}`);
});

/**
 * When we exit the application, we remove the random webhook that is persisted in
 * Sinch Dashboard to free up the resources from local development.
 */
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) =>
  process.on(signal, () => {
    if (webhookId) {
      deleteSinchAppSubscriptionWebhook()
        .then(() => {
          ngrok.kill().then(() => {
            process.exit(0);
          });
        })
        .catch(() => process.exit(1));
    }
  })
);

/**
 * Generate the payload for creating new webhook to Sinch Dashboard
 * Please see here https://developers.sinch.com/reference#webhooks_createwebhook
 * to have a complete view of possible fields you could configure with your webhook
 */
const getPayloadWebhook = () => ({
  app_id: config.SINCH_APP_APP_ID,
  id: ulid(),
  // inbound/sinch path needs to match with the endpoint specified in index.js.
  target: `${webhookUrl}/inbound/sinch`,
  target_type: "HTTP",
  /**
   * Please see here https://developers.sinch.com/docs/conversation-callbacks#webhook-triggers
   * to understand difference of triggers. For now, we are only interested in inbound messages
   * from end user
   */
  triggers: ["MESSAGE_INBOUND"],
});

/**
 * Creating webhook to Sinch Dashboard with the generated ngrok url
 * which receives the inbound traffic from end-user on underlying
 * channel to this app.
 */
const createSinchAppSubscriptionWebhook = async () => {
  const url = `${config.SINCH_APP_BASE_URL()}/${
    config.SINCH_APP_PROJECT_ID
  }/webhooks`;
  try {
    let response = await axios({
      method: "POST",
      url,
      data: JSON.stringify(getPayloadWebhook()),
      auth: {
        username: config.SINCH_APP_CLIENT_ID,
        password: config.SINCH_APP_CLIENT_SECRET,
      },
    });
    if (response.status === 200) {
      console.log(
        `Successfully creating webhook url ${
          getPayloadWebhook().target
        } to Sinch Dashboard`
      );
      webhookId = response.data.id;
    }
  } catch (err) {
    console.error(
      `Unable to create webhook to Sinch Dashboard. Please check your config variables`
    );
  }
};

/**
 * Delete a random generated ngrok url that is previously persisted on Sinch Dashboard
 */
const deleteSinchAppSubscriptionWebhook = async () => {
  try {
    let response = await axios({
      method: "DELETE",
      url: `${config.SINCH_APP_BASE_URL()}/${
        config.SINCH_APP_PROJECT_ID
      }/webhooks/${webhookId}`,
      auth: {
        username: config.SINCH_APP_CLIENT_ID,
        password: config.SINCH_APP_CLIENT_SECRET,
      },
    });
    if (response.status === 200) {
      console.log(
        `Successfully removed webhook url ${
          getPayloadWebhook().target
        } from Sinch Dashboard`
      );
      webhookId = null;
    }
  } catch {
    console.log(`Unable to remove webhook . ${JSON.stringify(e)}`);
  }
};
