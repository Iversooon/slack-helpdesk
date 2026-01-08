require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");
const bodyParser = require("body-parser");

// RECEIVER
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// REQUIRED FOR SLACK CHALLENGE
receiver.app.use(bodyParser.json());

// URL VERIFICATION HANDLER
receiver.app.post("/slack/events", (req, res, next) => {
  if (req.body && req.body.type === "url_verification") {
    return res.status(200).json({ challenge: req.body.challenge });
  }
  next();
});

// HEALTH CHECK
receiver.app.get("/", (req, res) => res.send("Helpdesk alive"));

// BOLT APP
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// SLASH COMMAND
app.command("/it-help", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "ticket_form",
      title: { type: "plain_text", text: "New IT Ticket" },
      submit: { type: "plain_text", text: "Submit" },
      blocks: [
        {
          type: "input",
          block_id: "desc",
          element: {
            type: "plain_text_input",
            multiline: true,
            action_id: "value"
          },
          label: {
            type: "plain_text",
            text: "Describe the problem"
          }
        }
      ]
    }
  });
});

// START SERVER
const PORT = process.env.PORT || 3000;
(async () => {
  await app.start(PORT);
  console.log("⚡ Helpdesk running on", PORT);
})();
