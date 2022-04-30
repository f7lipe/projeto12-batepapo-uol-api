import cors from 'cors'
import chalk from 'chalk'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
import express, {json} from 'express'
import { MongoClient, ServerApiVersion } from 'mongodb'
import joi from 'joi'

dotenv.config()

const app = express()
app.use(cors())
app.use(json())


let uolDb;

const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
    uolDb = client.db("uol-bate-papo")
});

const participantSchema = joi.object(
    {
        name: joi.string()
                    .min(1)
                    .required()
    }
)

//PARTICIPANTES
let participants = []
app.post('/participants', async (req, res) =>{


        const username = req.body
        const { error, value } = participantSchema.validate(username)

        try {
            const participants = await uolDb.collection("participants")
            const messages = await uolDb.collection("messages")
            const search = await participants.findOne(value)
            
            if (error === undefined ) {
              participants.insertOne({name: value.name, lastStatus: Date.now()})
              messages.insertOne({from: value.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format("HH:mm:ss")})
                res.sendStatus(201)
            } else {
                 res.status(422).send(error.details.map(detail => detail.message))
            }

        } catch (error) {
            
        }






})


app.listen(5000, () => {
    console.log(chalk.bold.green('Server running at port 5000'))
})
