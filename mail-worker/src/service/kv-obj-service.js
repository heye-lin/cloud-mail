const kvObjService = {

	async putObj(c, key, content, metadata) {
		await c.env.kv.put(key, content, { metadata: metadata });
	},

	async deleteObj(c, keys) {

		if (typeof keys === 'string') {
			keys = [keys];
		}

		if (keys.length === 0) {
			return;
		}

		await Promise.all(keys.map( key => c.env.kv.delete(key)));
	},

	async getObj(c, key) {
		const obj = await c.env.kv.getWithMetadata(key, { type: "arrayBuffer"});

		if (!obj?.value) {
			return null;
		}

		return {
			body: obj.value,
			httpMetadata: {
				contentType: obj.metadata?.contentType,
				contentDisposition: obj.metadata?.contentDisposition,
				cacheControl: obj.metadata?.cacheControl
			}
		};
	},

	async toObjResp(c, key) {

		const obj = await this.getObj(c, key);

		if (!obj?.body) {
			return new Response('Not Found', { status: 404 });
		}

		const headers = new Headers();
		headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');

		if (obj.httpMetadata?.contentDisposition) {
			headers.set('Content-Disposition', obj.httpMetadata.contentDisposition);
		}

		if (obj.httpMetadata?.cacheControl) {
			headers.set('Cache-Control', obj.httpMetadata.cacheControl);
		}

		return new Response(obj.body, {
			headers
		});

	}

};

export default kvObjService;
