const connectToDatabase = require("../lib/mongodb");

module.exports = async (req, res) => {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection("test").insertOne({
      message: "MongoDB connected successfully",
      createdAt: new Date(),
    });

    res.status(200).json({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};