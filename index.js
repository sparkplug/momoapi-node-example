const momo = require("mtn-momo");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const { Collections, Disbursements } = momo.create({
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
    .then(() => payPercentage(productId, qty))
    .then(() => {
      res.send("Payment succeeded and seller was paid 80%");
    })
    .catch(error => {
      if (error instanceof momo.MtnMoMoError) {
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
  console.log(`Listening on port ${port}`);
});

/**
 * A fake database
 */
function createDatabase() {
  const database = {
    Payouts: {
      // [id]: {}
    },
    Payments: {
      // [id]: {}
    },
    Products: {
      "1": { price: 1000, seller: "256784555222" },
      "2": { price: 2000, seller: "256784558222" }
    }
  };

  return {
    getDatabase() {
      return database;
    },
    createPayout(productId, qty) {
      return new Promise(resolve => {
        const id = Date.now();
        const { seller, price } = database.Products[productId];
        const amount = price * qty * 0.8;

        database.Payouts[id] = { seller, amount };

        resolve({ id, ...database.Payouts[id] });
      });
    },
    createPayment(productId, qty) {
      return new Promise(resolve => {
        const amount = database.Products[productId].price * qty;
        const id = Date.now();

        database.Payments[id] = { productId, amount, status: "pending" };

        resolve({ id, ...database.Payments[id] });
      });
    },
    updatePayment(id, status) {
      return new Promise(resolve => {
        database.Payments[id].status = status;
        resolve(database.Payments[id]);
      });
    }
  };
}

function collectPayment(phone, productId, qty) {
  return db
    .createPayment(productId, qty)
    .then(({ id, amount }) => {
      return collections.requestToPay({
        amount: amount,
        currency: "EUR",
        externalId: id,
        payer: {
          partyIdType: momo.PayerType.MSISDN,
          partyId: phone
        },
        payerMessage: "testing",
        payeeNote: "hello"
      });
    })
    .then(referenceId => pollTransaction(referenceId));
}

function payPercentage(productId, qty) {
  return db
    .createPayout(productId, qty)
    .then(({ id, amount, seller }) => {
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
    })
    .then(transactionId => disbursements.getTransaction(transactionId));
}

function pollTransaction(transactionId) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      return collections
        .getTransaction(transactionId)
        .then(transaction => {
          if (transaction.status === momo.Status.SUCCESSFUL) {
            clearInterval(interval);
            resolve(transaction.status);
          }
        })
        .catch(error => {
          console.log(error);
          clearInterval(interval);
          reject(error.transaction.status);
          database.Payments[error.transaction.externalId].status = "failed";
        });
    }, 5000);
  });
}

function getFriendlyErrorMessage(error) {
  if (error instanceof momo.NotEnoughFundsError) {
    return "You have insufficient balance";
  }

  // Other error messages go here

  return "Something went wrong";
}
