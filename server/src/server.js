import app from './app.js'
import { PORT } from './config/constants.js'
import { validateEnv } from './config/validateEnv.js'

validateEnv()

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})