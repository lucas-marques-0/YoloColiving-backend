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

// Rota para buscar todos os usuários.
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
    console.error("Erro: ", error.message);
    res.status(500).json({ error: "Erro ao buscar usuários no DynamoDB" });
  }
});

// Rota para adicionar um usuário e retornar todos os usuários.
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
    const usersFromTable = {
      TableName: TABLE_NAME,
    };
    const { allUsers } = await dynamoClient.send(new ScanCommand(usersFromTable));
    res.status(200).json(allUsers); 
  } catch (error) {
    console.error("Erro: ", error.message);
    res.status(500).json({ error: "Erro ao adicionar usuário ou buscar dados no DynamoDB" });
  }
});

// Rota para remover um usuário pelo seu id.
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
    res.status(200).json({
      message: `Usuário com removido com sucesso!`,
    });
  } catch (error) {
    console.error("Erro:", error.message);
    res.status(500).json({
      error: "Erro ao remover usuário no DynamoDB.",
      details: error.message,
    });
  }
});

// Atualiza um usuário pelo seu id.
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { Nome, Telefone, Email, Tipo, DataDeCadastro } = req.body;
  // Validação dos campos recebidos...
  if (!Nome || !Telefone || !Email || !Tipo || !DataDeCadastro) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  try {
    // Verifica se o usuário existe...
    const getUserParams = {
      TableName: TABLE_NAME,
      Key: { id },
    };
    const result = await dynamoClient.send(new GetCommand(getUserParams));
    const user = result.Item;
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    // Atualiza os dados do usuário...
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
    console.error('Erro ao editar usuário:', error.message);
    res.status(500).json({ error: 'Erro ao editar usuário no DynamoDB' });
  }
});

// Integra base de dados da API para iniciar o banco na AWS...
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
