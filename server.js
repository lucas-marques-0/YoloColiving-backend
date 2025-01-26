import express from "express";
import cors from "cors";
import axios from "axios";
import bodyParser from "body-parser";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoClient } from "./config/Credentials.js";
import { v4 as uuidv4 } from "uuid"; 
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 3333;
const app = express();

const dynamoClient = getDynamoClient();
const TABLE_NAME = process.env.TABLE_NAME;

app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.post("/users", async (req, res) => {
  try {
    const response = await axios.get("https://3ji5haxzr9.execute-api.us-east-1.amazonaws.com/dev/caseYolo");
    const body = JSON.parse(response.data.body);
    const users = body.clientes;
    for (const user of users) {
      const params = {
        TableName: TABLE_NAME,
        Item: {
          id: uuidv4(),
          Nome: user.Nome,
          Telefone: user.Telefone,
          Email: user["E-mail"],
          Tipo: user.Tipo,
          DataDeCadastro: user["Data de Cadastro"],
        },
      };
      await dynamoClient.send(new PutCommand(params));
    }
    res.status(200).json({ message: "Dados importados com sucesso!" });
  } catch (error) {
    console.error("Erro: ", error.message);
    res
      .status(500)
      .json({ error: "Erro ao consumir API ou salvar dados no DynamoDB" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
