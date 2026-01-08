const express = require("express");
const bodyParser = require("body-parser");


const { App, ExpressReceiver } = require("@slack/bolt");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events",
  processBeforeResponse: true
});

// Slack URL Verification FIX
receiver.app.use(bodyParser.json());
receiver.app.post("/slack/events", (req, res, next) => {
  if (req.body.type === "url_verification") {
    return res.status(200).send({ challenge: req.body.challenge });
  }
  next();
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// Root route so Render shows something real
receiver.app.get("/", (req, res) => {
  res.send("IT Helpdesk running");
});

// Database
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

// Modal submit
app.view("ticket_form", async ({ ack, body, client }) => {
  await ack();

  const desc = body.view.state.values.desc.value.value;
  const ticketNo = "TKT-" + Date.now();

  db.run(`INSERT INTO tickets VALUES(?,?,?,?,?)`,
    [ticketNo, body.user.id, "EVP_SLACK_ID", desc, "PENDING_EVP"]
  );

  await client.chat.postMessage({
    channel: "EVP_SLACK_ID",
    text: `📝 Ticket ${ticketNo}\n${desc}`
  });
});

const PORT = process.env.PORT || 3000;
(async () => {
  await app.start(PORT);
  console.log("⚡ IT Helpdesk running on port " + PORT);
})();
