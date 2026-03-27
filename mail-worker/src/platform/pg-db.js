function toPgPlaceholders(text) {
	let index = 0;
	return text.replace(/\?/g, () => {
		index += 1;
		return `$${index}`;
	});
}

function isQuerySql(text) {
	const sql = text.trim().toLowerCase();
	return sql.startsWith('select') || sql.startsWith('with') || sql.includes(' returning ');
}

class PgPreparedStatement {
	constructor(client, text, params = []) {
		this.client = client;
		this.text = text;
		this.params = params;
	}

	bind(...params) {
		return new PgPreparedStatement(this.client, this.text, params);
	}

	queryText() {
		return toPgPlaceholders(this.text);
	}

	async execute(client = this.client) {
		return client.unsafe(this.queryText(), this.params);
	}

	async run() {
		await this.execute();
		return { success: true };
	}

	async all() {
		const rows = await this.execute();
		return { results: rows };
	}

	async first() {
		const rows = await this.execute();
		return rows[0] || null;
	}
}

export function createPgCompatDb(client) {
	return {
		prepare(text) {
			return new PgPreparedStatement(client, text);
		},

		async batch(statements) {
			return client.begin(async (tx) => {
				const results = [];

				for (const statement of statements) {
					const rows = await statement.execute(tx);

					if (isQuerySql(statement.text)) {
						results.push({ results: rows });
					} else {
						results.push({ success: true });
					}
				}

				return results;
			});
		}
	};
}
