import "dotenv/config";
import express from "express";
import analyzeRouter from "./routes/analyze.js";

const app = express();
const PORT = process.env.PORT || 3000;

//Permite que express interprete cuerpos JSON
app.use(express.json());

//Endpoint de comprobación.
app.get("/api/health", (_request, response) => {
    response.status(200).json({
        status: "ok",
    });
});

//Todas las rutas de análisis comenzarán con /api/analyze.
app.use("/api/analyze", analyzeRouter);

app.listen(PORT, () => {
  console.log(`JobFit AI backend running on http://localhost:${PORT}`);
});