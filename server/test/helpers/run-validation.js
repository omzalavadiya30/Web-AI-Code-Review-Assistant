export const runValidation = async (middlewares, body) => {
    const req = { body };
    let jsonBody = null;
    let statusCode = 200;
    let stopped = false;

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(payload) {
            jsonBody = payload;
            stopped = true;
            return this;
        },
    };

    for (const middleware of middlewares) {
        if (stopped) break;

        if (typeof middleware.run === "function") {
            await middleware.run(req);
            continue;
        }

        await new Promise((resolve, reject) => {
            const next = (error) => (error ? reject(error) : resolve());
            const result = middleware(req, res, next);

            if (stopped) {
                resolve();
                return;
            }

            if (result?.then) {
                result.then(resolve).catch(reject);
            }
        });
    }

    return {
        body: req.body,
        response: jsonBody,
        statusCode,
        stopped,
    };
};
