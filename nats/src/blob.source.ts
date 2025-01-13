import type { NatsClient } from "../mod.ts";
import { $pub_crate$_constructor } from "./pub_crate.ts";

export interface SourceOptions {
    _?: void;
}

export class BlobSource {
    private constructor(readonly client: NatsClient, readonly subject: string, readonly options: SourceOptions) {
    }

    [$pub_crate$_constructor](client: NatsClient, subject: string, options: SourceOptions): BlobSource {
        return new BlobSource(client, subject, options);
    }

    #last_value = new Uint8Array(0);

    #full_update = new Uint8Array(0);

    public update(data: Uint8Array): void {
        this.#last_value = data;
        if (data.length + 1 > this.#full_update.length || data.length > this.#full_update.length * 2 + 10) {
            this.#full_update = new Uint8Array(data.length + 1);
            this.#full_update[0] = 0;
        }
        this.#full_update.set(data, 1);
        this.client.publish(`%blob_sink_raw%.${this.subject}`, this.#full_update);
    }
}
