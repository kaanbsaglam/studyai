const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const classroomRoutes = require("./src/routes/classroomRoutes");
const documentRoutes = require("./src/routes/documentRoutes");
const ragRoutes = require("./src/routes/ragRoutes");
const documentLLMRoutes = require("./src/routes/documentLLMRoutes");
const noteRoutes = require("./src/routes/noteRoutes");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/classrooms", classroomRoutes);
app.use("/documents", documentRoutes);
app.use("/rag", ragRoutes);
app.use("/documents", documentLLMRoutes);
app.use("/notes", noteRoutes);
app.get("/", (req, res) => {
    res.send("StudyAI Backend Running");
});

app.listen(process.env.PORT, () => {
    console.log("Server running on port " + process.env.PORT);
});
