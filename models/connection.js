require('dotenv').config();
const mongoClient = require('mongodb').MongoClient;

const { DB_URL, DB_NAME } = process.env;

const connection = () =>
  mongoClient
    .connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((conn) => conn.db(DB_NAME))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });

module.exports = connection;
