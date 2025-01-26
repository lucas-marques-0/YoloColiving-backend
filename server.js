import express from "express";
import cors from "cors";
import axios from "axios"; 
import bodyParser from "body-parser";

const port = process.env.PORT || 3333;
const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.get("/users", async (req, res) => {
    try {
        const response = await axios.get("https://3ji5haxzr9.execute-api.us-east-1.amazonaws.com/dev/caseYolo");
        const data = JSON.parse(response.data.body);
        res.json(data)
    } catch (error) {
        console.error('Erro: ', error.message)
        res.status(500).json({ error: 'Erro ao consumir api de colaboradores cadastrados' })
    }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});