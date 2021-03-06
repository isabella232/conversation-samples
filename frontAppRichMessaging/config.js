require("dotenv").config();

const config = {
  FRONT_APP_INCOMING_URI: process.env.FRONT_APP_INCOMING_URI,
  FRONT_APP_TOKEN: process.env.FRONT_APP_TOKEN,
  SINCH_APP_ENVIRONMENT: process.env.SINCH_APP_ENVIRONMENT,
  SINCH_APP_PROJECT_ID: process.env.SINCH_APP_PROJECT_ID,
  SINCH_APP_APP_ID: process.env.SINCH_APP_APP_ID,
  SINCH_APP_CLIENT_ID: process.env.SINCH_APP_CLIENT_ID,
  SINCH_APP_CLIENT_SECRET: process.env.SINCH_APP_CLIENT_SECRET,
  SINCH_APP_TOKEN_URI: () =>
    `https://${config.SINCH_APP_ENVIRONMENT}.auth.sinch.com/oauth2/token`,
  SINCH_APP_BASE_URL: () =>
    `https://${config.SINCH_APP_ENVIRONMENT}.conversation.api.sinch.com/v1/projects`,
  PORT: process.env.PORT ? process.env.PORT : 80,
};

module.exports = {
  config,
};
