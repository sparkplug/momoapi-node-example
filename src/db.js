
module.exports = function createDatabase() {
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