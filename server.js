import express from "express";
import cors from "cors";
import axios from "axios";
import bodyParser from "body-parser";
import { PutCommand, ScanCommand, GetCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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

// Busca todos os usuários.
app.get("/users", async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
    };
    const { Items } = await dynamoClient.send(new ScanCommand(params));
    if (Items) {
      res.status(200).json(Items);
    } else {
      res.status(404).json({ message: "Nenhum usuário encontrado." });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar usuários." });
  }
});

// Adiciona um usuário.
app.post("/users", async (req, res) => {
  try {
    const { Nome, Telefone, Email, Tipo, DataDeCadastro } = req.body;
    const params = {
      TableName: TABLE_NAME,
      Item: {
        id: uuidv4(),
        Nome: Nome,
        Telefone: Telefone,
        Email: Email,
        Tipo: Tipo,
        DataDeCadastro: DataDeCadastro,
      },
    };
    await dynamoClient.send(new PutCommand(params));
    res.status(200).json({ message: "Usuário adicionado com sucesso!" }); 
  } catch (error) {
    res.status(500).json({ message: "Erro ao adicionar usuário." });
  }
});

// Remove um usuário pelo seu id.
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const getUser = {
      TableName: TABLE_NAME,
      Key: { id }, 
    };
    const result = await dynamoClient.send(new GetCommand(getUser));
    const user = result.Item; 
    if (!user) {
      return res.status(404).json({
        message: `Usuário não encontrado.`,
      });
    }
    const deleteParams = {
      TableName: TABLE_NAME,
      Key: { id },
    };
    await dynamoClient.send(new DeleteCommand(deleteParams));
    res.status(200).json({ message: `Usuário deletado com sucesso!` });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar usuário."});
  }
});

// Edita um usuário pelo seu id.
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { Nome, Telefone, Email, Tipo, DataDeCadastro } = req.body;
  if (!Nome || !Telefone || !Email || !Tipo || !DataDeCadastro) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  try {
    const getUserParams = {
      TableName: TABLE_NAME,
      Key: { id },
    };
    const result = await dynamoClient.send(new GetCommand(getUserParams));
    const user = result.Item;
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `
        SET Nome = :Nome, 
            Telefone = :Telefone, 
            Email = :Email, 
            Tipo = :Tipo, 
            DataDeCadastro = :DataDeCadastro
      `,
      ExpressionAttributeValues: {
        ':Nome': Nome,
        ':Telefone': Telefone,
        ':Email': Email,
        ':Tipo': Tipo,
        ':DataDeCadastro': DataDeCadastro,
      },
      ReturnValues: 'UPDATED_NEW',
    };
    await dynamoClient.send(new UpdateCommand(updateParams));
    res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao editar usuário no DynamoDB' });
  }
});

// Opcional - Integra base de dados da API para iniciar o banco na AWS.
app.post("/users/api", async (req, res) => {
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
    const scanParams = {
      TableName: TABLE_NAME,
    };
    const { Items } = await dynamoClient.send(new ScanCommand(scanParams));
    res.status(200).json(Items)
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao consumir API ou salvar dados no DynamoDB" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
