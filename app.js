const dbConfig = require('./dbConfig');
const roles = require('./roles');
const sql = require('mssql');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key'; // Replace with a strong secret key


app.use(bodyParser.json());


//-------------------------------apis---------------------------//
// Register a new user
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Check if all required fields are present
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required fields' });
  }

  // Check if the user already exists
  const isExist = await isUserExist(username)
  if (isExist) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const user = await addUser(username, password)
  // Return the created user in the response
  return res.status(201).json({ message: 'User registered successfully', user: user });
});


// Login user and generate JWT token
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Check if the user exists

  const isExist = await isUserExist(username)
  if (!isExist) {
    return res.status(400).json({ error: 'User does not exist' });
  }

  const  user = await getUser(username)
  const isMatch = await bcrypt.compare(password, user.password);
  if (!user || !isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username, roles: user.role }, SECRET_KEY, { expiresIn: '1h' });

  return res.json({ token });
});


// Assign roles to a user
app.post('/assign-roles', authenticateTokenbyAdmin,async (req, res) => {
  const { username, roles } = req.body;

  // Check if the user exists
  const user = await isUserExist(username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updateUserQuery = `UPDATE Users SET roles = '${roles}' WHERE username = ${username}`;
  const updateUserResult = await pool.request().query(createUserQuery);

  user.roles = roles;

  // Return the updated roles in the response
  return res.json({ message: 'Roles assigned successfully', roles: user.roles });
});


// Get all users
app.get('/users',authenticateToken ,async (req, res) => {
  const users = await getUsers()
  return res.json(users);
});

//--------------------------------------------DB QUERY--------------------------------------//
async function getUsers() {
  try {
    let pool = await sql.connect(dbConfig);
    let users = await pool.request().query("SELECT * from Users");
    return users.recordsets;
  }
  catch (error) {
    console.log(error);
  }
}


async function getUser(username) {
  try {
    let pool = await sql.connect(dbConfig);
    let users = await pool.request().query(`SELECT * from Users WHERE username='${username}'`);
    const user = users.recordset
    console.log(user);
    return {"username" : user[0].username, "password" : user[0].password, "role" : user[0].roles};
  }
  catch (error) {
    console.log(error);
  }
}


async function addUser(username, password) {
  try {
    let pool = await sql.connect(dbConfig);
    const hashedPwd = await bcrypt.hash(password, 10);
    const createUserQuery = `INSERT INTO Users (username, password) VALUES ('${username}', '${hashedPwd}')`;
    const createUserResult = await pool.request().query(createUserQuery);

    console.log(createUserResult);

    pool.close();
    return { "username": username, "password": password };
  }
  catch (error) {
    console.log(error);
  }
}

async function isUserExist(username) {
  try {
    let pool = await sql.connect(dbConfig);
    let duplicateResult = await pool.request().query(`SELECT * from Users WHERE username='${username}'`);
    pool.close();
    if (duplicateResult.recordset.length > 0)
      return true
    return false
  }
  catch (error) {
    console.log(error);
  }
}

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.user = user;
    next();
  });
}

function authenticateTokenbyAdmin(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    else if(user.role == roles.ADMIN){
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.user = user;
    next();
  });
}

app.listen(PORT, () => {
  console.log("Server is running");
});