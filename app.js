require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const { App } = require("@slack/bolt");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔥 Slack challenge handler
app.post("/slack/events", (req, res, next) => {
  if (req.body.type === "url_verification") {
    return res.status(200).send(req.body.challenge);
  }
  next();
});

// Root test
app.get("/", (req, res) => res.send("Helpdesk alive"));

// Slack Bolt (no receiver)
const bolt = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: false
});

// Attach Bolt to Express
app.post("/slack/events", bolt.requestListener());

// DB
const db = new sqlite3.Database("./tickets.db");
db.run(`
CREATE TABLE IF NOT EXISTS tickets (
 ticket_no TEXT,
 employee_id TEXT,
 evp_id TEXT,
 description TEXT,
 status TEXT
)`);

// Slash command
bolt.command("/it-help", async ({ ack, body, client }) => {
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("⚡ Helpdesk running on", PORT);
});
