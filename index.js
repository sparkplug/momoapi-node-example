const momo = require("mtn-momo");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const callbackHost = "6d395033.ngrok.io";

const { Collections } = momo({ callbackHost });

const collections = Collections({
  primaryKey: "028b71f923f24df9a3d9fe90a645309e",
  userSecret: "1c2ea77e4cdc41018b0e9083737aa3b0",
  userId: "5042a526-49fa-4647-bda6-3b3c0aaba2bb"
});

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.all("/callback", function(req, res) {
  console.log(req.body);
  res.send("ok");
});

app.get("/pay", (_req, res) => {
  return collections
    .requestToPay({
      amount: "1000",
      currency: "EUR",
      externalId: "1234556",
      payer: {
        partyIdType: "MSISDN",
        partyId: "256784567444"
      },
      payerMessage: "testing",
      payeeNote: "hello",
      callbackUrl: "https://6d395033.ngrok.io/callback"
    })
    .then(referenceId => collections.getTransaction(referenceId))
    .then(transaction => res.json(transaction));
});

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next()
})

app.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`Listening on port ${port}`);
});
