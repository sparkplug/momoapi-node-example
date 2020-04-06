require("dotenv").config();

const MoMo = require("mtn-momo");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const createDatabase = require("./db");

const { Collections, Disbursements } = MoMo.create({
  callbackHost: "example.com"
});

const collections = Collections({
  userSecret: process.env.COLLECTIONS_USER_SECRET,
  userId: process.env.COLLECTIONS_USER_ID,
  primaryKey: process.env.COLLECTIONS_PRIMARY_KEY
});

const disbursements = Disbursements({
  userSecret: process.env.DISBURSEMENTS_USER_SECRET,
  userId: process.env.DISBURSEMENTS_USER_ID,
  primaryKey: process.env.DISBURSEMENTS_PRIMARY_KEY
});

const app = express();
const port = 3000;

const db = createDatabase();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

/**
 * Callbacks still do not work in sandbox
 */
app.all("/callback", function(req, res) {
  console.log({ callbackRequestBody: req.body });
  res.send("ok");
});

app.post("/pay", (req, res, next) => {
  const { phone, productId, qty } = req.body;
  collectPayment(phone, productId, qty)
    .then(collectionId => poll(() => collections.getTransaction(collectionId)))
    .then(() => payPercentage(productId, qty))
    .then(disbursementId =>
      poll(() => disbursements.getTransaction(disbursementId))
    )
    .then(() => {
      res.send("Payment succeeded and seller was paid 80%");
    })
    .catch(error => {
      if (error instanceof MoMo.MtnMoMoError) {
        res.send(getFriendlyErrorMessage(error));
      }

      next(error);
    });
});

app.get("/balance", (_req, res, next) =>
  collections
    .getBalance()
    .then(account => res.json(account))
    .catch(next)
);

app.use(express.static("public"));

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

function collectPayment(phone, productId, qty) {
  return db.createPayment(productId, qty).then(({ id, amount }) => {
    return collections.requestToPay({
      amount: amount,
      currency: "EUR",
      externalId: id,
      payer: {
        partyIdType: MoMo.PayerType.MSISDN,
        partyId: phone
      },
      payerMessage: "testing",
      payeeNote: "hello"
    });
  });
}

function payPercentage(productId, qty) {
  return db.createPayout(productId, qty).then(({ id, amount, seller }) => {
    return disbursements.transfer({
      amount,
      currency: "EUR",
      externalId: id,
      payee: {
        partyIdType: "MSISDN",
        partyId: seller
      },
      payerMessage: "testing",
      payeeNote: "hello"
    });
  });
}

function poll(fn) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      return fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearInterval(interval));
    }, 5000);
  });
}

function getFriendlyErrorMessage(error) {
  if (error instanceof MoMo.NotEnoughFundsError) {
    return "You have insufficient balance";
  }

  // Other error messages go here

  return "Something went wrong";
}
