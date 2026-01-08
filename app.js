require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");
const bodyParser = require("body-parser");
const Database = require("better-sqlite3");

// DATABASE
const db = new Database("helpdesk.db");

// RECEIVER — THIS IS THE IMPORTANT PART
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  endpoints: "/slack/events"
});

// MUST be mounted BEFORE Bolt
receiver.app.use(bodyParser.json());

// SLACK CHALLENGE HANDLER — BEFORE BOLT TOUCHES IT
receiver.app.post("/slack/events", (req, res, next) => {
  if (req.body && req.body.type === "url_verification") {
    console.log("Slack challenge received");
    return res.status(200).json({ challenge: req.body.challenge });
  }
  next();
});

// ROOT TEST
receiver.app.get("/", (req, res) => res.send("Helpdesk alive"));

// BOLT APP
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// DATABASE
db.prepare(`
CREATE TABLE IF NOT EXISTS tickets (
 ticket_no TEXT,
 employee_id TEXT,
 evp_id TEXT,
 description TEXT,
 status TEXT
)`).run();

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
      blocks: [{
        type: "input",
        block_id: "desc",
        element: { type: "plain_text_input", multiline: true, action_id: "value" },
        label: { type: "plain_text", text: "Describe the problem" }
      }]
    }
  });
});

// START SERVER
const PORT = process.env.PORT || 3000;
(async () => {
  await app.start(PORT);
  console.log("⚡ Helpdesk running on", PORT);
})();
