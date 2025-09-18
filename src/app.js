const express = require("express")
const cors = require('cors')
const RoutineRoute = require("./routes/RoutineRoute")
const Person = require ('./routes/PersonRoute')

const app = express();
app.use(express.json());

//Cors
const corsOptions = {
    origin:'https://app-gym-front-cbwxun6kz-luis-zalazars-projects.vercel.app'
}
app.use(cors(corsOptions))


app.use ('/api/Routine', RoutineRoute)
app.use('/api/person', Person)

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Active in ${port}`))