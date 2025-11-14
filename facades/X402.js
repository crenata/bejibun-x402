import X402Builder from "../builders/X402Builder";
export default class X402 {
    static setConfig(config) {
        return new X402Builder().setConfig(config);
    }
    static setFacilitator(config) {
        return new X402Builder().setFacilitator(config);
    }
    static setPaywall(config) {
        return new X402Builder().setPaywall(config);
    }
    static setRequest(config) {
        return new X402Builder().setRequest(config);
    }
}
