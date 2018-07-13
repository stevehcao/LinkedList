process.env.NODE_ENV = 'test';
const db = require('../db');
const request = require('supertest');
const app = require('../');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const auth = {};

beforeAll(async () => {
  await db.query(`CREATE TABLE companies
  (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT,
    handle TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );`);

  await db.query(`CREATE TABLE users
  (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    photo TEXT, 
    current_company TEXT REFERENCES companies (handle) ON DELETE SET NULL
  );`);

  await db.query(`CREATE TABLE jobs
  (
    id SERIAL PRIMARY KEY,
    title TEXT,
    salary TEXT,
    equity FLOAT,
    company TEXT REFERENCES companies(handle) ON DELETE CASCADE
  );`);

  await db.query(`CREATE TABLE jobs_users
  (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  );`);
});

//SET UP
// beforeEach(async () => {
//   const hashedCompanyPassword = await bcrypt.hash('secret', 1);
//   await db.query(
//     "INSERT INTO companies (name, email, handle, password) VALUES ('testc', 'test1@gmail.com', 'testcompany', $1)",
//     [hashedCompanyPassword]
//   );
//   const companyResponse = await request(app)
//     .post('/company-auth')
//     .send({
//       handle: 'testcompany',
//       password: 'secret'
//     });

//   auth.company_token = companyResponse.body.token;
//   auth.current_company_id = jwt.decode(auth.company_token).company_id;

//   // login a user, get a token, store the user ID and token
//   const hashedPassword = await bcrypt.hash('secret', 1);
//   await db.query(
//     `INSERT INTO users (username, password, first_name, last_name, email) VALUES ('kevin', $1, 'john', 'qi', 'ya@gmail.com')`,
//     [hashedPassword]
//   );
//   const response = await request(app)
//     .post('/user-auth')
//     .send({
//       username: 'kevin',
//       password: 'secret'
//     });

//   auth.user_token = response.body.token;
//   auth.current_user_id = jwt.decode(auth.user_token).user_id;
// });

// afterEach(async () => {
//   await db.query('DELETE FROM users');
//   await db.query('DELETE FROM companies');
// });

afterAll(async () => {
  await db.query('DROP TABLE IF EXISTS jobs_users');
  await db.query('DROP TABLE IF EXISTS jobs');
  await db.query('DROP TABLE IF EXISTS users');
  await db.query('DROP TABLE IF EXISTS companies');
  db.end();
});

describe(`POST /companies`, () => {
  test('successfully create a new company', async () => {
    const response = await request(app)
      .post('/companies')
      .send({
        name: 'michael',
        email: 'google@gmail.com',
        handle: 'rithm',
        password: 'foo123',
        logo: 'https://avatars0.githubusercontent.com/u/13444851?s=460&v=4'
      });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('michael');
  });
});

describe(`POST / company-auth`, () => {
  test('successfully gets a token', async () => {
    const response = await request(app)
      .post('/company-auth')
      .send({
        handle: 'rithm',
        password: 'foo123'
      });
    auth.company_token = response.body.token;
    auth.current_handle = jwt.decode(auth.company_token).handle;
    expect(response.status).toBe(200);
    expect(response.body.token).not.toEqual(undefined);
  });
});

describe(`POST /users`, () => {
  test('successfully create a new user', async () => {
    const response = await request(app)
      .post('/users')
      .send({
        first_name: 'Michael',
        last_name: 'Hueter',
        username: 'hueter',
        email: 'michael@rithmschool.com',
        password: 'foo123',
        current_company: 'rithm',
        photo: 'https://avatars0.githubusercontent.com/u/13444851?s=460&v=4'
      });
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('hueter');
  });
});

describe(`POST / user-auth`, () => {
  test('successfully gets a token', async () => {
    const response = await request(app)
      .post('/user-auth')
      .send({
        username: 'hueter',
        password: 'foo123'
      });
    auth.user_token = response.body.token;
    auth.current_username = jwt.decode(auth.user_token).username;
    expect(response.status).toBe(200);
    expect(response.body.token).not.toEqual(undefined);
  });
});

describe(`GET / users`, () => {
  test('successfully gets all the users', async () => {
    const response = await request(app)
      .get('/users')
      .set('authorization', auth.user_token);
    expect(response.status).toBe(200);
    expect(response.body[0].username).toBe('hueter');
  });
});

describe(`GET / users/:username`, () => {
  test('successfully gets a list of 1 user', async () => {
    const response = await request(app)
      .get(`/users/${auth.current_username}`)
      .set('authorization', auth.user_token);
    expect(response.status).toBe(200);
    expect(response.body.first_name).toBe('Michael');
  });
});

describe(`PATCH / users/:username`, () => {
  test('successfully updates a user', async () => {
    const response = await request(app)
      .patch(`/users/${auth.current_username}`)
      .send({
        first_name: 'Elie',
        last_name: 'Hueter',
        username: 'hueter',
        email: 'michael@rithmschool.com',
        password: 'foo123',
        current_company: 'rithm',
        photo: 'https://avatars0.githubusercontent.com/u/13444851?s=460&v=4'
      })
      .set('authorization', auth.user_token);

    expect(response.status).toBe(200);
    expect(response.body.first_name).toEqual('Elie');
  });
});

describe(`DELETE / users/:id`, () => {
  test('successfully deletes own user', async () => {
    const response = await request(app)
      .delete(`/users/${auth.current_username}`)
      .set('authorization', auth.user_token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Deleted user!' });
  });

  // test('cannot delete other user', async () => {
  //   const username = auth.current_username + '1';
  //   console.log(username);
  //   const response = await request(app)
  //     .delete(`/users/${username}`)
  //     .set('authorization', auth.user_token);
  //   delete auth.current_username;
  //   delete auth.user_token;
  //   console.log(response);
  //   expect(response.status).toBe(403);
  // });
});

describe(`GET / companies`, () => {
  test('gets all the companies', async () => {
    const response = await request(app)
      .get('/companies')
      .set('authorization', auth.company_token);
    expect(response.status).toBe(200);
    expect(response.body[0].name).toBe('michael');
  });
});

describe(`GET / companies/:handle`, () => {
  test('gets a list of 1 company', async () => {
    const response = await request(app)
      .get(`/companies/${auth.current_handle}`)
      .set('authorization', auth.company_token);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('michael');
  });
});

describe(`PATCH / companies/:handle`, () => {
  test('successfully updates a company', async () => {
    const response = await request(app)
      .patch(`/companies/${auth.current_handle}`)
      .send({
        name: 'rithm',
        email: 'google@gmail.com',
        handle: 'rithm',
        password: 'foo123',
        logo: 'https://avatars0.githubusercontent.com/u/13444851?s=460&v=4'
      })
      .set('authorization', auth.company_token);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('rithm');
  });
});

// describe(`POST / company-auth`, () => {
//   test('gets a token', async () => {
//     const response = await request(app)
//       .post('/company-auth')
//       .send({
//         handle: 'go',
//         password: 'foo123'
//       });
//     expect(response.status).toBe(200);
//     expect(response.body.token).not.toEqual(undefined);
//   });
// });

//   test('cannot delete other user', async () => {
//     const response = await request(app)
//       .delete(`/users/${auth.current_user_id + 1}`)
//       .set('authorization', auth.user_token);
//     expect(response.status).toBe(403);
//   });
// });
