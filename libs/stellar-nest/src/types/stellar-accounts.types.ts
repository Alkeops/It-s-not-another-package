import { TAssetConfig } from "./utils.types"

export type AccountConfig = {
    type: string,
    public: string,
    secret: string,
}

export type CreateAccountConfig = {
    by?: string,
    starting?: {
        balance: string,
        baseTrustline?: (string | TAssetConfig)[],
    },
}