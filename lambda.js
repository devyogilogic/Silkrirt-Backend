const serverlessHttp = require('serverless-http');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('./app');
const { seedStaticRoutes } = require('./utils/seoSync');

let dbConnected = false;

async function connectDb() {
  if (dbConnected && mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });
  dbConnected = true;
  seedStaticRoutes().catch((e) => console.error('SEO seed error:', e));
}

const wrappedHandler = serverlessHttp(app);

module.exports.handler = async (event, context) => {
  // Allow Lambda to return the response before the event loop empties
  // so the DB connection can be reused across warm invocations.
  context.callbackWaitsForEmptyEventLoop = false;

  await connectDb();
  return wrappedHandler(event, context);
};
