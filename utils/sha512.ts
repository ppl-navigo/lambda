import { createHash } from "crypto";

export function sha512(content: string) {
    return createHash('sha512').update(content).digest('hex')
}