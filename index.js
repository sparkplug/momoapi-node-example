const momo = require("mtn-momo");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const callbackHost = process.env.CALLBACK_HOST;

const { Collections } = momo({ callbackHost });

const collections = Collections({
  primaryKey: process.env.PRIMARY_KEY,
  userSecret: process.env.USER_SECRET,
  userId: process.env.USER_ID
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
      callbackUrl: `https://${callbackHost}/callback`
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
