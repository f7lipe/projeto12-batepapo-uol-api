import cors from 'cors'
import chalk from 'chalk'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
import express, { json } from 'express'
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

const messageSchema = joi.object(
    {
        to: joi.string()
            .min(1)
            .required(),
        text: joi.string()
            .min(1)
            .required(),
        type: joi.string()
                 .valid('message', 'private_message')
                 .required()
    }
)

//PARTICIPANTES
app.post('/participants', async (req, res) => {


    const username = req.body
    const { error, value } = participantSchema.validate(username)

    if(error) return res.status(422).send(error.details.map(detail => detail.message))
    
    try {
        const participantsCollection = await uolDb.collection("participants")
        const participant = await participantsCollection.findOne(value)
        const messagesCollection = await uolDb.collection("messages")

        if(participant) return res.sendStatus(409)

          await  participantsCollection.insertOne(
                { 
                    name: value.name, 
                    lastStatus: Date.now() 
                })
          await  messagesCollection.insertOne(
                { 
                    from: value.name, to: 'Todos', 
                    text: 'entra na sala...', 
                    type: 'status', 
                    time: dayjs().format("HH:mm:ss") 
                })
            res.sendStatus(201)
    } catch (error) {
        console.log(chalk.red(error))
    }
})

app.get('/participants', async (req, res) => {
    try {
        const participantsCollection = await uolDb.collection("participants")
        const participants = await participantsCollection.find({}).toArray()

        res.status(200).send(participants)

    } catch (error) {
        console.log(chalk.red(error))
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
            const participantsCollection = await uolDb.collection("participants")
            const participant = await participantsCollection.findOne({name:user})
            if (!participant) return res.sendStatus(422)
            const messagesCollection = await uolDb.collection("messages")
            messagesCollection.insertOne(
                { 
                    from: user, 
                    to: value.to, 
                    text: value.text, 
                    type: value.type, 
                    time: dayjs().format("HH:mm:ss") 
                })
            res.sendStatus(201)
        } catch (error) {
            console.log(chalk.red(error))
        }
    } else  res.sendStatus(422)
    
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
        if (limit !== NaN && limit){
         const splicedMessages = [...allMessages].slice(-limit)
         
         res.status(201).send(splicedMessages)
        }
        else res.send(allMessages)
        
    } catch (error) {
        console.log(chalk.red(error))
    }
})


//STATUS
app.post('/status', async (req, res)=>{
    const { user } = req.headers
    try {
        const participants = await uolDb.collection("participants")
        const {_id, name} = await participants.findOne({name: user})
        if(name){
            await participants.updateOne(
                { 
                    name: name
                }, 
                {$set: {lastStatus: Date.now()}}
            )
            res.sendStatus(200)
        }    
        
    } catch (error) {
        res.status(404).send(error)
    }

})

setInterval(removeParticipants, 15000)


async function removeParticipants(){
  try {
    const participantsCollection = await uolDb.collection("participants")
    const participants = await participantsCollection.find().toArray()
    participants.forEach(async participant =>{
        const now = Date.now()
        const lastStatus = participant.lastStatus
        const absoluteTimeDifference = Math.abs(lastStatus - now)
        if(absoluteTimeDifference >= 10000){
            await uolDb.collection('messages').insertOne({
                from: participant.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time:  dayjs().format("HH:mm:ss")
            })

            await participantsCollection.deleteOne(participant)
        }
    })
  } catch (error) {
      
  }
}

app.listen(5000, () => {
    console.log(chalk.bold.green('Server running at port 5000'))
})
