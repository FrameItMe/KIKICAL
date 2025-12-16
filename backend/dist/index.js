import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoute from './routes/auth.js';
import userRoute from './routes/user.js';
import foodRoute from './routes/food.js';
import mealRoute from './routes/meals.js';
import workoutRoute from './routes/workouts.js';
import achievementsRoute from './routes/achievements.js';
const app = new Hono();
app.use("*", cors({
    origin: "*",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
}));
app.route('/auth', authRoute);
app.route('/user', userRoute);
app.route('/food', foodRoute);
app.route('/meals', mealRoute);
app.route('/workouts', workoutRoute);
app.route('/achievements', achievementsRoute);
serve({
    fetch: app.fetch,
    port: 8000
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
