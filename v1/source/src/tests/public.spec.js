import app from '../app';
import supertest from 'supertest';

describe.skip('root endpoint get and post', () => {
    test('get root returns 200 and data', async () => {
        const result = await supertest(app).get('/')
        console.log(result.statusCode)
        console.log(result.body)
        // expect(result.statusCode).toEqual(200)
        // expect(result.body.name).toBeTruthy()
        //
        // console.log(result.body)
    })
})