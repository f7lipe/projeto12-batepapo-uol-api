import cors from 'cors'
import chalk from 'chalk'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
import express, { json } from 'express'
import { MongoClient, ServerApiVersion } from 'mongodb'
import joi from 'joi'
import { query } from 'express'

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

const messageSchema = joi.object(
    {
        to: joi.string()
            .min(1)
            .required(),
        text: joi.string()
            .min(1)
            .required(),
        type: joi.string().allow("message").allow("private-message")
    }
)
//PARTICIPANTES
app.post('/participants', async (req, res) => {


    const username = req.body
    const { error, value } = participantSchema.validate(username)

    try {
        const participants = await uolDb.collection("participants")
        const messages = await uolDb.collection("messages")
        const search = await participants.findOne(value)

        if (error === undefined) {
            participants.insertOne({ name: value.name, lastStatus: Date.now() })
            messages.insertOne({ from: value.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format("HH:mm:ss") })
            res.sendStatus(201)
        } else {
            res.status(422).send(error.details.map(detail => detail.message))
        }

    } catch (error) {
        res.status(422).send(Error)
    }
})

app.get('/participants', async (req, res) => {
    try {
        const participants = await uolDb.collection("participants")
        const search = await participants.find({}).toArray()

        res.status(200).send(search)

    } catch (error) {
        res.status(422).send(error.details.map(detail => detail.message))
    }
})

//MENSAGENS 
app.post('/messages', async (req, res) => {
    const { user } = req.headers
    const message = req.body
    const { error, value } = messageSchema.validate(message)

    if (!error) {
        try {
            const messages = await uolDb.collection("messages")
            messages.insertOne({ from: user, to: value.to, text: value.text, type: value.type, time: dayjs().format("HH:mm:ss") })
            res.sendStatus(201)
        } catch (error) {
            res.status(422).send(error)
        }
    } else {
        res.sendStatus(422)
    }
})

app.get('/messages', async (req, res)=>{
    const { user } = req.headers
    const limit = parseInt(req.query.limit)
    try {
        const messages = await uolDb.collection("messages")
        const allMessages = await messages.find(
            {   
         
                $or: [{type: 'message'}, {type: 'private-message'}, {from: user}, {to: user}]
            }
        ).toArray()
        if (limit){
         const splicedMessages = [...allMessages].splice(0,limit)
         
         res.status(201).send(splicedMessages)
        }
        else res.send(allMessages)
        
    } catch (error) {
        res.status(422).send(error)
    }
})

app.listen(5000, () => {
    console.log(chalk.bold.green('Server running at port 5000'))
})
