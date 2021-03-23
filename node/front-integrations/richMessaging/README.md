## Purpose

FrontApp (https://frontapp.com/) is a cloud-based customer communication platform that allows you to collaborate, comment, assign and respond to your customers’ support needs -- all from the convenience of one inbox regardless of which mobile messaging channels your customers are using.

There are two demo apps that Sinch has provided for you, Front-TextOnlyMessaging which supports the sending and receiving of text messages to and from your customers and Front-RichMessaging which supports the sending and receiving of both text and rich media such as images to and from your customers for customer engagement and support. 

This demo will show how you can save time by using FrontApp and the Sinch Conversation API to configure one custom channel to assist your customers who are using SMS and Facebook Messenger all while having a single inbox for them.  

## Features Supported Using This Tutorial 

Using their phones, your customers can send messages to you using SMS and Facebook Messenger messaging channels. When you receive the request, you can then respond back to your customers using text via SMS and Facebook Messenger channels from one inbox. 

## Disclaimer 

This integration demo does not allow you to initiate a message to your customer and instead limits your responses to their incoming requests. When using multiple channels with a single inbox in FrontApp, and composing a new outbound message, FrontApp currently does not allow you to specify which messaging channel ought to be used to send this message. 

As the Conversation API supports multiple channels, you need to specify which channel to be used as a preferred channel and which channel to be used as a backup so that the integration will work as desired. As such for this demo, the ability to compose a new message in FrontApp has been turned off. 

## Assumptions
This demo assumes that you have a fully configured Sinch App on Sinch Dashboard. To know more detail, please visit https://developers.sinch.com/docs/conversation-getting-started to understand more about different specs such as app_id, client_id, client_secret, project_id, project_region. 

## 🧐 What's inside?

Here are the top-level files and directories

```text
frontApp
├── config.js
├── index.js
├── .gitignore
├── package-lock.json
├── package.json
├── local.js
├── diagram.md
└── README.md
```

1.  **`config.js`**: A file that contains all the environment variables that need for this project to be functioning

2.  **`index.js`**: A file that contains the api controller, and logic to exchange messages between Sinch and FrontApp

3.  **`.gitignore`**: This file tells git which files it should not track / not maintain a version history for.

4.  **`package-lock.json`** (See `package.json` below, first). This is an automatically generated file based on the exact versions of your npm dependencies that were installed for your project. **(You won’t change this file directly).**

5.  **`package.json`**: A manifest file for Node.js projects, which includes things like metadata (the project’s name, author, etc). This manifest is how npm knows which packages to install for your project.

6.  **`local.js`** : You can use this script to run a development environment where you do not need to configure ngrok and the webhook to Sinch Dashboard

7.  **`diagram.md`**: A text file containing the architecture code

8.  **`README.md`**: A text file containing useful reference information about your project.

## Architecture

![Architecture flow](images/architecture.png)

1.  **`FrontApp`**: FrontApp is the actor that this app will forward the message that it receives from Sinch, so that frontApp users can see the message on frontApp inboxes. FrontApp can send the message to App and App will forward to Sinch

2.  **`Sinch`** : Sinch is the actor that this app will send the message to and Sinch will deliver that message to end-user

3.  **`App`**: The demo app that handles the logic for exchanging the messages between 2 parties (Sinch and frontApp)

4.  **`End-User`** : User on their device send the message to us

## Quick start

There are two ways to run the app. 

1.  **Run app with index.js**

    If you run with index.js , you will need to set up ngrok and the webhook to Sinch Dashboard. Please follow the instructions below. 

    ```shell
    cd plugins/frontApp
    npm install
    npm run start
    ```

2.  **Run app with local.js**

    If you run with local.js, you will **not** need to set up ngrok and sinch webhook, everything is taken care of for you.

    ```shell
    cd plugins/frontApp
    npm install
    npm run dev
    ```

## Environment variables

1. **`FRONT_APP_INCOMING_URI`** : The URI that the App needs to send message to FrontApp.

2. **`FRONT_APP_TOKEN`**: FrontApp Authentication Token

3. **`SINCH_APP_ENVIRONMENT`** : The region in which your Sinch App is located, ( EU , US)

4. **`SINCH_APP_PROJECT_ID`** : The project id of your Sinch App

5. **`SINCH_APP_APP_ID`**: The App id of your Sinch App

6. **`SINCH_APP_CLIENT_ID`** : The Client id of your Sinch App

7. **`SINCH_APP_CLIENT_SECRET`** : The Client Secret of your Sinch App

8. **`PORT`** : The port for the application

9. **`HOST`** : The ngrok url which exposes the app to the world. This is needed because we want to serve our static images content. Please notice that, every time you change ngrok, you will need to update this as well.

Then create **_`.env`_** file

Please follow **.env.development** in the directory for an example. 

## Set up Ngrok 

If you run **local.js** , please skip this section because this step is taken care for you. 

If you run **index.js** , you should expose your app via ngrok for quick development. Please follow this guide from ngrok https://ngrok.com/download , choose the file that matches with your operating system , and run it. 

After that , you should see a generated ngrok url like so . 

```shell
https://1052143dbf4c.ngrok.io
```

With this generated ngrok, you can now configure webhook on Sinch Dashboard, and FrontApp. The next two steps will show you just that. 

## Create Webhook in Sinch App 

If you run the app with **local.js**, please skip this section 
Navigate to https://dashboard.sinch.com/convapi/apps , and click on your desire app. Navigate to Webhooks -> Add Webhook. 
You should see the window pop up asking for the following fields 

1.  **`Target Type`**: Please choose HTTP 
2.  **`Target Url`**: Please have your url as follow `{ngrok_url}/inbound/sinch`. For example, https://1052143dbf4c.ngrok.io/inbound/sinch
3.  **`Secret Token`**: You can skip this, but if you want to study more about security, please checkout https://developers.sinch.com/docs/conversation-callbacks#validating-callbacks
4.  **`Triggers`**: Please select `MESSAGE_INBOUND`. 

## Set up FrontApp Custom Channel

Go to your FrontApp account to create an inbox and custom channel so that you can view and manage your messages. Go to **Settings > Inboxes > Add a Team Inbox**. Once the inbox is created, you will be on the page to select which channel to create. 

To use the Sinch Conversation API with FrontApp, you will create a custom channel. Scroll down the page and select Custom Channel as shown below

![frontApp_creation_app](images/frontAppCustomCreation.png)

Your FrontApp channel is now created. Other than the name you gave your channel, set the rest of the settings to match the image below. 

![frontApp_set_up_app](images/frontAppCustomSetUpApp.png)

Set the Allow New Messages to Off. This will result in removal of the Compose button in your view and inhibit you to create new messages for Sinch Conversation API integration. 

At the bottom of the form, go to API Endpoints. Select the drop-down arrow on the right side to expand the Incoming and Outgoing URLS. 

- Please copy the incoming url, and save it to **.env** variable as **FRONT_APP_INCOMING_URI** . This url is how our App can send messages to frontApp. 

- Please put the `${ngrok_url}/inbound/front` to outgoing field. This url is how frontApp can send messages to our app. 

![frontApp_set_up_url](images/frontAppSetUpUrl.png)

Finally, click **Save Changes** 

## FrontApp Api Key 

Finally, we need the frontApp API key to authenticate the request to frontApp incoming url. Navigate to https://app.frontapp.com/settings/tools/api , and click **New Token**. In the dropdown of **Select Scopes**, select all of them. Give the api a name, and finally click **Create**. 

Then click on the new Api token with the name you just created, and copy the **token** and save it into **.env** file as **FRONT_APP_TOKEN**.

Assume that you have `12345679019` is the number that you provisioned with Sinch, and the SMS app is configured within Conversation API Sinch App. 
Send a message to that number from any number of yours, and you will see the message will appear on FrontApp Dashboard. 
