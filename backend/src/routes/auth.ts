import { Hono } from "hono";

const authRoute = new Hono();

authRoute.get("/", (c) => c.text("Hello AUTH!"));

authRoute.post("/register", async (c) => {
  try {
    const body = await c.req.json();

    const result = await registerUser(body);

    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

authRoute.post("/login", async (c) => {
});

authRoute.post("/logout", async (c) => {
});


export default authRoute;