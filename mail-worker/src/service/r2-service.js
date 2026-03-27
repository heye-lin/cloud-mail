import s3Service from './s3-service.js';
import settingService from './setting-service.js';
import kvObjService from './kv-obj-service.js';

const r2Service = {

	async storageType(c) {

		const setting = await settingService.query(c);
		const { bucket, endpoint, s3AccessKey, s3SecretKey } = setting;

		if (!!(bucket && endpoint && s3AccessKey && s3SecretKey)) {
			return 'S3';
		}

		if (c.env.r2) {
			return 'R2';
		}

		return 'KV';
	},

	async putObj(c, key, content, metadata) {

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.putObj(c, key, content, metadata);
		}

		if (storageType === 'R2') {
			await c.env.r2.put(key, content, {
				httpMetadata: { ...metadata }
			});
		}

		if (storageType === 'S3') {
			await s3Service.putObj(c, key, content, metadata);
		}

	},

	async getObj(c, key) {
		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			return kvObjService.getObj(c, key);
		}

		if (storageType === 'R2') {
			const obj = await c.env.r2.get(key);
			if (!obj) {
				return null;
			}

			return {
				body: obj.body,
				httpMetadata: {
					contentType: obj.httpMetadata?.contentType,
					contentDisposition: obj.httpMetadata?.contentDisposition,
					cacheControl: obj.httpMetadata?.cacheControl
				}
			};
		}

		if (storageType === 'S3') {
			return s3Service.getObj(c, key);
		}

		return null;
	},

	async delete(c, key) {

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.deleteObj(c, key);
		}

		if (storageType === 'R2') {
			await c.env.r2.delete(key);
		}

		if (storageType === 'S3'){
			await s3Service.deleteObj(c, key);
		}

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

		return new Response(obj.body, { headers });
	}

};
export default r2Service;
