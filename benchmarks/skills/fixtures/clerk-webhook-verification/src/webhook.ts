import express from "express";

export const app = express();
export const receivedUserIds: string[] = [];

app.use(express.json());
app.post("/api/webhooks", (req, res) => {
  if (req.body.type === "user.created") receivedUserIds.push(req.body.data.id);
  res.status(200).send("OK");
});
app.post("/echo", (req, res) => res.json(req.body));
