const { App, ExpressReceiver } = require("@slack/bolt");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./tickets.db");

db.run(`
CREATE TABLE IF NOT EXISTS tickets (
 ticket_no TEXT,
 employee_id TEXT,
 evp_id TEXT,
 description TEXT,
 status TEXT
)`);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events"
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

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
app.view("ticket_form", async ({ ack, body, client }) => {
 await ack();

 const desc = body.view.state.values.desc.value.value;
 const ticketNo = "TKT-" + Date.now();

 db.run(`INSERT INTO tickets VALUES(?,?,?,?,?)`,
  [ticketNo, body.user.id, "EVP_SLACK_ID", desc, "PENDING_EVP"]
 );

 await client.chat.postMessage({
  channel: "EVP_SLACK_ID",
  text: `📝 Ticket ${ticketNo}\n${desc}`,
  blocks: [
   { type:"section", text:{type:"mrkdwn",text:`*Ticket ${ticketNo}*\n${desc}`} },
   { type:"actions", elements:[
    { type:"button", text:{type:"plain_text",text:"Approve"}, action_id:"evp_approve", value:ticketNo }
   ]}
  ]
 });
});
app.action("evp_approve", async ({ ack, body, client }) => {
 await ack();

 const ticketNo = body.actions[0].value;

 db.run(`UPDATE tickets SET status='APPROVED' WHERE ticket_no=?`, [ticketNo]);

 await client.chat.postMessage({
  channel: "#it-support",
  text: `🛠 Approved Ticket: ${ticketNo}`,
  blocks:[
   { type:"section", text:{type:"mrkdwn",text:`*Ticket ${ticketNo}* Approved`} },
   { type:"actions", elements:[
    { type:"button", text:{type:"plain_text",text:"Accept Ticket"}, action_id:"it_accept", value:ticketNo }
   ]}
  ]
 });
});
app.action("it_accept", async ({ ack, body, client }) => {
 await ack();

 const ticketNo = body.actions[0].value;

 db.run(`UPDATE tickets SET status='IN_PROGRESS' WHERE ticket_no=?`, [ticketNo]);

 await client.chat.postMessage({
  channel: body.user.id,
  text: `You accepted ticket ${ticketNo}`
 });
});
const PORT = process.env.PORT || 3000;
receiver.app.listen(PORT, () => {
  console.log("⚡ IT Helpdesk running on port " + PORT);
});
