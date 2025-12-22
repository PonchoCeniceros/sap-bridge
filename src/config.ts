import { SapCredentials } from "./types.js";

/**
 *
 */
export function SapConn(): SapCredentials {
  return {
    serviceLayer: {
      ApiUrl: process.env.SAP_API_SL_URL,
      CompanyDB: process.env.SAP_API_COMPANY,
      UserName: process.env.SAP_API_SL_UID,
      Password: process.env.SAP_API_SL_PWD,
      SessionStorage: process.env.SAP_API_SL_STG,
    },
    hanaDatabase: {
      serverNode: process.env.SAP_API_HN_URL,
      UID: process.env.SAP_API_HN_UID,
      PWD: process.env.SAP_API_HN_PWD,
      sslValidateCertificate: process.env.SAP_API_HN_SSL,
      database: process.env.SAP_API_COMPANY,
    }
  };
}