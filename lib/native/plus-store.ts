import { registerPlugin } from "@capacitor/core";

export type PlusStoreProduct = {
  id: string;
  displayName: string;
  displayPrice: string;
  description: string;
};

export type PlusStorePurchase = {
  signedTransaction: string;
  originalTransactionId: string;
  productId: string;
};

export interface PlusStorePlugin {
  getProduct(): Promise<PlusStoreProduct>;
  purchase(options: { appAccountToken: string }): Promise<PlusStorePurchase>;
  restore(): Promise<PlusStorePurchase>;
}

const PlusStore = registerPlugin<PlusStorePlugin>("PlusStore", {
  web: {
    async getProduct() {
      throw new Error("StoreKit is only available in the iOS app.");
    },
    async purchase() {
      throw new Error("StoreKit is only available in the iOS app.");
    },
    async restore() {
      throw new Error("StoreKit is only available in the iOS app.");
    },
  },
});

export default PlusStore;
