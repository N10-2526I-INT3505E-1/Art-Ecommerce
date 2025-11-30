// File: /services/api/src/products/httpError.ts

export class HttpError extends Error {
    public status: number;
    public code: string;

    constructor(status: number, message: string, code: string = 'ERROR') {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'HttpError'; // Quan trọng để check instanceof
    }
}