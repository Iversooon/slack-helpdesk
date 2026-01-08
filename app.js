const Database = require("better-sqlite3");
const db = new Database("helpdesk.db");


// Receiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events",
  processBeforeResponse: true
});

// Slack challenge fix
receiver.app.use(bodyParser.json());
receiver.app.post("/slack/events", (req, res, next) => {
  if (req.body.type === "url_verification") {
    console.log("Slack challenge OK");
    return res.status(200).send({ challenge: req.body.challenge });
  }
  next();
});

// Root test
receiver.app.get("/", (req, res) => res.send("Helpdesk alive"));

// Bolt App
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// Database
const db = new Database("tickets.db");
db.prepare(`
CREATE TABLE IF NOT EXISTS tickets (
 ticket_no TEXT,
 employee_id TEXT,
 evp_id TEXT,
 description TEXT,
 status TEXT
)`).run();

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

// Start
const PORT = process.env.PORT || 3000;
(async () => {
  await app.start(PORT);
  console.log("⚡ Helpdesk running on", PORT);
})();
