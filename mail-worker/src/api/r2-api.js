import r2Service from '../service/r2-service.js';
import app from '../hono/hono.js';

app.get('/oss/*', async (c) => {
	const key = c.req.path.split('/oss/')[1];
	return r2Service.toObjResp(c, key);
});

app.get('/attachments/*', async (c) => {
	return r2Service.toObjResp(c, c.req.path.substring(1));
});

app.get('/static/*', async (c) => {
	return r2Service.toObjResp(c, c.req.path.substring(1));
});

