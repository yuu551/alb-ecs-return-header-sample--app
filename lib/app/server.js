import express from "express";

const app = express();
const port = 80;

app.get("/", (req, res) => {
  const headers = req.headers;
  res.json({
    message: "Request Headers",
    headers: headers
  });
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});