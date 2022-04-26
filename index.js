import cors from 'cors'
import chalk from 'chalk'
import express, {json} from 'express'

const app = express()
app.use(cors())
app.use(json())

app.get('/', (req, res) =>{
    res.send('Servidor configurado corretamente')
})

app.get('/teste', (req, res) =>{
    res.send('Funcionando corretament')
})

app.listen(5000, () => {
    console.log(chalk.bold.green('Server on at port 5000'));
})
