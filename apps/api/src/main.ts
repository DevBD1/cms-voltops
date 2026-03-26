import express, { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { AppService } from './app.service';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const appService = new AppService();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send(appService.getHello());
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
