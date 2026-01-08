require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// URL verification fix
receiver.app.post("/slack/events", (req, res, next) => {
  if (req.body?.type === "url_verification") {
    return res.status(200).json({ challenge: req.body.challenge });
  }
  next();
});

// Health check
receiver.app.get("/", (_, res) => res.send("Helpdesk alive"));

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// Slash command
app.command("/it-help", async ({ ack, body, client }) => {
  await ack(); // MUST HAPPEN IN <3 SECONDS

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

const PORT = process.env.PORT || 3000;
receiver.app.listen(PORT, () => console.log("⚡ Helpdesk running on", PORT));
