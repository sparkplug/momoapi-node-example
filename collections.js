const momo = require("mtn-momo");

const { Collections } = momo.create({
  callbackHost: "example.com"
});

const collections = Collections({
  userSecret: "d061d14e985f439690a46335088e25c9",
  userId: "63b1d7ba-aebf-4e69-a2be-7fb4dd6aed1d",
  primaryKey: "2a022bcc89bc4984988fb8b9dbdbbc6c"
});

collections
  .requestToPay({
    amount: 50,
    currency: "EUR",
    externalId: "123456",
    payer: {
      partyIdType: "MSISDN",
      partyId: "256774290781"
    }
  })
  .then(transactionId => console.log(transactionId))
  .catch(error => console.log(error));
