export default class X402Exception extends Error {
    code: number;
    data?: any;
    constructor(message?: string, data?: any, code?: number);
}
