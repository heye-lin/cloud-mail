function metadataKey(key) {
	return `${key}::__meta`;
}

function toArrayBuffer(buffer) {
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function normalizeValue(value) {
	if (value instanceof ArrayBuffer) {
		return Buffer.from(value);
	}

	if (ArrayBuffer.isView(value)) {
		return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
	}

	return value;
}

async function writeWithTtl(redis, key, value, ttl) {
	if (ttl) {
		await redis.set(key, value, 'EX', ttl);
		return;
	}

	await redis.set(key, value);
}

export function createRedisKv(redis) {
	return {
		async get(key, options = {}) {
			if (options.type === 'json') {
				const raw = await redis.get(key);
				return raw ? JSON.parse(raw) : null;
			}

			if (options.type === 'arrayBuffer') {
				const raw = await redis.getBuffer(key);
				return raw ? toArrayBuffer(raw) : null;
			}

			return redis.get(key);
		},

		async put(key, value, options = {}) {
			const ttl = options.expirationTtl;
			await writeWithTtl(redis, key, normalizeValue(value), ttl);

			if (options.metadata !== undefined) {
				await writeWithTtl(redis, metadataKey(key), JSON.stringify(options.metadata), ttl);
			}
		},

		async delete(key) {
			await redis.del(key, metadataKey(key));
		},

		async getWithMetadata(key, options = {}) {
			const [value, rawMetadata] = await Promise.all([
				options.type === 'arrayBuffer' ? redis.getBuffer(key) : redis.get(key),
				redis.get(metadataKey(key))
			]);

			if (!value) {
				return { value: null, metadata: null };
			}

			return {
				value: options.type === 'arrayBuffer' ? toArrayBuffer(value) : value,
				metadata: rawMetadata ? JSON.parse(rawMetadata) : null
			};
		}
	};
}
