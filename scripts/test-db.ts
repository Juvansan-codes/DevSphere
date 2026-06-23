import dbConnect from '../lib/mongodb';

async function testConnection() {
  try {
    await dbConnect();
    console.log('Successfully connected to MongoDB cluster.');
  } catch (error) {
    console.error('Failed to connect to MongoDB cluster:', error);
  } finally {
    process.exit(0);
  }
}

testConnection();
